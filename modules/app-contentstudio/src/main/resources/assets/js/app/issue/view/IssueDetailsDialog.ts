import {SchedulableDialog} from '../../dialog/SchedulableDialog';
import {Issue} from '../Issue';
import {ContentPublishPromptEvent} from '../../browse/ContentPublishPromptEvent';
import {Router} from '../../Router';
import {PublishDialogItemList} from '../../publish/PublishDialogItemList';
import {ContentPublishDialogAction} from '../../publish/ContentPublishDialogAction';
import {PublishDialogDependantList} from '../../publish/PublishDialogDependantList';
import {UpdateIssueRequest} from '../resource/UpdateIssueRequest';
import {IssueStatus, IssueStatusFormatter} from '../IssueStatus';
import {IssueServerEventsHandler} from '../event/IssueServerEventsHandler';
import {PublishRequest} from '../PublishRequest';
import {PublishRequestItem} from '../PublishRequestItem';
import {IssueDetailsDialogButtonRow} from './IssueDetailsDialogDropdownButtonRow';
import {DetailsDialogSubTitle} from './IssueDetailsDialogSubTitle';
import {PublishProcessor} from '../../publish/PublishProcessor';
import {DependantItemsWithProgressDialogConfig} from '../../dialog/DependantItemsWithProgressDialog';
import {IssueCommentsList} from './IssueCommentsList';
import {IssueCommentTextArea} from './IssueCommentTextArea';
import {CommentIssueRequest} from '../resource/CommentIssueRequest';
import {ListIssueCommentsRequest} from '../resource/ListIssueCommentsRequest';
import AEl = api.dom.AEl;
import DialogButton = api.ui.dialog.DialogButton;
import ContentSummaryAndCompareStatusFetcher = api.content.resource.ContentSummaryAndCompareStatusFetcher;
import PublishContentRequest = api.content.resource.PublishContentRequest;
import TaskState = api.task.TaskState;
import ListBox = api.ui.selector.list.ListBox;
import ContentSummaryAndCompareStatus = api.content.ContentSummaryAndCompareStatus;
import MenuButton = api.ui.button.MenuButton;
import Action = api.ui.Action;
import User = api.security.User;
import i18n = api.util.i18n;
import Tooltip = api.ui.Tooltip;
import NavigatedDeckPanel = api.ui.panel.NavigatedDeckPanel;
import TabBar = api.ui.tab.TabBar;
import TabBarItemBuilder = api.ui.tab.TabBarItemBuilder;
import Panel = api.ui.panel.Panel;
import AppHelper = api.util.AppHelper;
import TabBarItem = api.ui.tab.TabBarItem;
import PrincipalComboBoxBuilder = api.ui.security.PrincipalComboBoxBuilder;
import PrincipalType = api.security.PrincipalType;
import PrincipalLoader = api.security.PrincipalLoader;
import ComboBox = api.ui.selector.combobox.ComboBox;
import InPlaceTextInput = api.ui.text.InPlaceTextInput;
import ModalDialogHeader = api.ui.dialog.ModalDialogHeader;

class IssueDetailsInPlaceTextInput
    extends InPlaceTextInput {

    private titleId: number;

    constructor(title?: string) {
        super(title);
    }

    public formatTextToDisplay(inputValue: string): string {
        return `${inputValue}<span class="title-id">#${this.titleId}</span>`;
    }

    setTitleId(id: number): IssueDetailsInPlaceTextInput {
        this.titleId = id;
        return this;
    }
}

class IssueDetailsDialogHeader
    extends api.dom.DivEl
    implements ModalDialogHeader {

    private input: IssueDetailsInPlaceTextInput;
    private titleChangedListeners: { (newTitle: string, oldTitle: string): void }[] = [];

    constructor(title: string) {
        super('modal-dialog-header');
        this.input = new IssueDetailsInPlaceTextInput(title);
        this.input.onEditModeChanged((editMode, newValue, oldValue) => {
            if (!editMode && newValue != oldValue) {
                this.notifyTitleChanged(newValue, oldValue);
            }
        });
        this.appendChild(this.input);
    }

    setTitle(value: string, escapeHtml: boolean = true): IssueDetailsDialogHeader {
        this.input.setValue(value);
        return this;
    }

    getTitle(): string {
        return this.input.getValue();
    }

    setTitleId(value: number): IssueDetailsDialogHeader {
        this.input.setTitleId(value);
        return this;
    }

    cancelEdit() {
        if (this.input.isEditMode()) {
            this.input.setEditMode(false, true);
        }
    }

    onTitleChanged(listener: (newTitle: string, oldTitle: string) => void) {
        this.titleChangedListeners.push(listener);
    }

    unTitleChanged(listener: (newTitle: string, oldTitle: string) => void) {
        this.titleChangedListeners = this.titleChangedListeners.filter(curr => curr !== listener);
    }

    private notifyTitleChanged(newTitle: string, oldTitle: string) {
        this.titleChangedListeners.forEach(listener => listener(newTitle, oldTitle));
    }
}

export class IssueDetailsDialog
    extends SchedulableDialog {

    private issue: Issue;

    private currentUser: User;

    private errorTooltip: Tooltip;

    private static INSTANCE: IssueDetailsDialog = new IssueDetailsDialog();

    private itemsTab: TabBarItem;
    private commentsTab: TabBarItem;
    private assigneesTab: TabBarItem;
    private tabPanel: api.ui.panel.NavigatedDeckPanel;
    private closeAction: api.ui.Action;
    private reopenAction: api.ui.Action;
    private commentAction: api.ui.Action;
    private detailsSubTitle: DetailsDialogSubTitle;
    private publishAction: ContentPublishDialogAction;
    private publishButton: api.ui.button.MenuButton;
    private itemSelector: api.content.ContentComboBox<api.content.resource.ContentTreeSelectorItem>;
    private publishProcessor: PublishProcessor;
    private saveOnLoaded: boolean;
    private skipNextServerUpdatedEvent: boolean;
    private ignoreNextExcludeChildrenEvent: boolean;
    private debouncedUpdateIssue: Function;
    private commentsList: IssueCommentsList;
    private commentTextArea: IssueCommentTextArea;
    private assigneesCombobox: api.ui.security.PrincipalComboBox;

    private constructor() {
        super(<DependantItemsWithProgressDialogConfig> {
            title: i18n('dialog.issue'),
                dialogSubName: i18n('dialog.issue.resolving'),
                processingLabel: `${i18n('field.progress.publishing')}...`,
            showDependantList: false,
                buttonRow: new IssueDetailsDialogButtonRow(),
                processHandler: () => {
                    new ContentPublishPromptEvent([]).fire();
                },
            }
        );
        this.addClass('issue-dialog issue-details-dialog grey-header');
        this.publishProcessor = new PublishProcessor(this.getItemList(), this.getDependantList());

        this.debouncedUpdateIssue = AppHelper.debounce(this.doUpdateIssue.bind(this), 1000);

        this.commentTextArea = new IssueCommentTextArea();
        this.commentTextArea.onKeyUp(event => {
            const value = this.commentTextArea.getValue();
            this.commentAction.setEnabled(value.length > 0);
        });
        this.loadCurrentUser().done(currentUser => {
            this.commentTextArea.setUser(currentUser);
        });
        this.initRouting();
        this.handleIssueGlobalEvents();
        this.initActions();
    }

    public static get(): IssueDetailsDialog {
        return IssueDetailsDialog.INSTANCE;
    }

    doRender(): Q.Promise<boolean> {
        return super.doRender().then((rendered: boolean) => {

            this.createSubTitle();
            this.createBackButton();
            this.createAddCommentButton();
            this.createReopenButton();
            this.createCloseButton();
            this.createNoActionMessage();

            this.assigneesTab = new TabBarItemBuilder().setLabel(i18n('field.assignees')).build();
            const assigneesPanel = this.createAssigneesPanel();

            this.commentsTab = new TabBarItemBuilder().setLabel(i18n('field.comments')).build();
            const commentsPanel = this.createCommentsPanel(this.commentsTab);

            this.itemsTab = new TabBarItemBuilder().setLabel(i18n('field.items')).build();
            const itemsPanel = this.createItemsPanel();

            const tabBar = new TabBar();
            this.tabPanel = new NavigatedDeckPanel(tabBar);
            this.tabPanel.onPanelShown(event => {
                const isAssignees = event.getPanel() == assigneesPanel;
                const isComments = event.getPanel() == commentsPanel;
                this.toggleClass('tab-assignees', isAssignees);
                this.toggleClass('tab-comments', isComments);
                this.toggleClass('tab-items', !isAssignees && !isComments);
            });
            this.tabPanel.addNavigablePanel(this.commentsTab, commentsPanel, true);
            this.tabPanel.addNavigablePanel(this.itemsTab, itemsPanel);
            this.tabPanel.addNavigablePanel(this.assigneesTab, assigneesPanel, true);

            this.appendChildToHeader(tabBar);
            this.appendChildToContentPanel(this.tabPanel);
            this.prependChildToFooter(this.commentTextArea);

            this.initElementListeners();
            this.updateCountsAndActions();

            if (this.issue) {
                this.setIssue(this.issue);
            }

            return rendered;
        });
    }

    private updateCountsAndActions() {
        const count = this.countTotal();
        this.itemsTab.setLabel(i18n('field.items') + (count > 0 ? ` (${count})` : ''));
        this.updateButtonCount(i18n('action.publishAndCloseIssue'), count);
        this.toggleAction(count > 0);
    }

    protected toggleAction(enable: boolean) {
        super.toggleAction(enable);
        this.publishButton.setEnabled(this.publishProcessor.containsInvalidItems() && this.publishProcessor.isAllPublishable());
        this.errorTooltip.setActive(this.publishProcessor.containsInvalidItems());
    }

    private createAssigneesPanel() {
        const assigneesPanel = new Panel();
        let userLoader = new PrincipalLoader().setAllowedTypes([PrincipalType.USER]);
        this.assigneesCombobox = new PrincipalComboBoxBuilder().setLoader(userLoader).build();
        const updateTabCount = (save) => {
            const num = this.assigneesCombobox.getValue().split(ComboBox.VALUE_SEPARATOR).length;
            this.assigneesTab.setHtml(i18n('field.assignees') + (num > 0 ? ` (${num})` : ''));
            if (save) {
                this.debouncedUpdateIssue(this.issue.getIssueStatus(), true);
            }
        };
        this.assigneesCombobox.onValueChanged(event => updateTabCount(false));
        this.assigneesCombobox.onOptionSelected(option => updateTabCount(true));
        this.assigneesCombobox.onOptionDeselected(option => updateTabCount(true));
        assigneesPanel.appendChild(this.assigneesCombobox);
        return assigneesPanel;
    }

    private createCommentsPanel(tab: TabBarItem) {
        const commentsPanel = new Panel();
        this.commentsList = new IssueCommentsList();

        const updateCommentsCount = () => {
            const commentCount = this.commentsList.getItemCount();
            tab.setLabel(i18n('field.comments') + (commentCount > 0 ? ` (${commentCount})` : ''));
        };

        this.commentsList.onItemsAdded(updateCommentsCount);
        this.commentsList.onItemsRemoved(updateCommentsCount);
        commentsPanel.appendChild(this.commentsList);
        return commentsPanel;
    }

    private createItemsPanel() {
        const itemsPanel = new Panel();
        this.itemSelector = api.content.ContentComboBox.create()
            .setShowStatus(true)
            .setHideComboBoxWhenMaxReached(false)
            .build();
        this.itemSelector.onOptionSelected(o => {
            this.saveOnLoaded = true;
            const ids = [o.getSelectedOption().getOption().displayValue.getContentId()];
            ContentSummaryAndCompareStatusFetcher.fetchByIds(ids).then(result => {
                this.addListItems(result);
            });
        });
        this.itemSelector.onOptionDeselected(o => {
            this.saveOnLoaded = true;
            const id = o.getSelectedOption().getOption().displayValue.getContentId();
            const items = this.getItemList().getItems().filter(item => !item.getContentId().equals(id));
            this.setListItems(items, true);
        });
        itemsPanel.appendChildren<api.dom.DivEl>(this.itemSelector, this.getItemList(), this.getDependantsContainer());
        return itemsPanel;
    }

    open() {
        super.open();
        if (this.isRendered()) {
            this.tabPanel.selectPanelByIndex(0);
        }
    }

    private createSubTitle() {
        this.detailsSubTitle = new DetailsDialogSubTitle(this.issue, this.currentUser);
        this.detailsSubTitle.onIssueStatusChanged((event) => {
            const newStatus = IssueStatusFormatter.fromString(event.getNewValue());
            this.debouncedUpdateIssue(newStatus);
        });

        this.setSubTitleEl(this.detailsSubTitle);
    }

    private initElementListeners() {
        const handleRemoveItemClicked = (item) => {
            this.saveOnLoaded = true;

            const combo = this.itemSelector.getComboBox();
            const option = combo.getOptionByValue(item.getContentId().toString());
            if (option) {
                // option may not be loaded yet
                combo.deselectOption(option, true);
            }
        };
        const itemList = this.getItemList();
        itemList.onItemsAdded(items => {
            this.initItemListTogglers(itemList);
            this.updateCountsAndActions();
            this.updateShowScheduleDialogButton();
        });
        itemList.onItemsRemoved(items => {
            this.updateCountsAndActions();
            this.updateShowScheduleDialogButton();
        });
        itemList.onItemRemoveClicked(handleRemoveItemClicked);
        itemList.onExcludeChildrenListChanged(items => {
            if (!this.ignoreNextExcludeChildrenEvent) {
                // save if toggle was updated manually only
                this.saveOnLoaded = true;
            }
            this.ignoreNextExcludeChildrenEvent = false;
        });

        this.getDependantList().onItemRemoveClicked(handleRemoveItemClicked);

        this.publishProcessor.onLoadingFinished(() => {
            this.updateCountsAndActions();
            if (this.saveOnLoaded) {
                this.debouncedUpdateIssue(this.issue.getIssueStatus(), true);
                this.saveOnLoaded = false;
            }

            if (this.publishProcessor.containsInvalidDependants()) {
                this.setDependantListVisible(true);
            }
        });
    }

    protected getDependantIds(): ContentId[] {
        return this.publishProcessor.getDependantIds();
    }

    private loadCurrentUser(): wemQ.Promise<User> {
        return new api.security.auth.IsAuthenticatedRequest().sendAndParse().then((loginResult) => {
            this.currentUser = loginResult.getUser();
            return this.currentUser;
        });
    }

    private initRouting() {
        this.onShown(() => {
            Router.setHash('issue/' + this.issue.getId());
        });

        this.onClosed(Router.back);
    }

    private handleIssueGlobalEvents() {
        const updateHandler: Function = api.util.AppHelper.debounce((issue: Issue) => {
            this.setIssue(issue);
        }, 3000, true);

        IssueServerEventsHandler.getInstance().onIssueUpdated((issues: Issue[]) => {
            issues.some(issue => {
                if (issue.getId() == this.issue.getId()) {
                    if (this.isVisible() && !this.skipNextServerUpdatedEvent) {
                        updateHandler(issue);
                    } else {
                        // we've probably triggered the save ourselves so just update the pojo and read-only status
                        this.issue = issue;
                        this.setReadOnly(issue && issue.getIssueStatus() == IssueStatus.CLOSED);
                    }
                    return true;
                }
            });

            this.skipNextServerUpdatedEvent = false;
        });
    }

    setReadOnly(value: boolean) {
        this.getItemList().setReadOnly(value);
        this.getDependantList().setReadOnly(value);
    }

    setIssue(issue: Issue): IssueDetailsDialog {

        if ((this.isRendered() || this.isRendering()) && issue) {
            this.publishProcessor.setExcludedIds(issue.getPublishRequest().getExcludeIds());

            const ids = issue.getPublishRequest().getItemsIds();
            if (ids.length > 0) {
                this.itemSelector.setValue(ids.map(id => id.toString()).join(';'));
                ContentSummaryAndCompareStatusFetcher.fetchByIds(ids).then(items => {
                    this.setListItems(items);
                });
            } else {
                this.itemSelector.getComboBox().clearSelection(true, false);
                this.getItemList().clearItems();
            }

            (<IssueDetailsDialogHeader>this.header).setTitleId(issue.getIndex()).setTitle(issue.getTitle());

            this.detailsSubTitle.setIssue(issue, true);
            this.toggleControlsAccordingToStatus(issue.getIssueStatus());

            new ListIssueCommentsRequest(issue.getId()).sendAndParse().then(response => {
                this.commentsList.setItems(response.getIssueComments());
            });

            this.assigneesCombobox.setValue(issue.getApprovers().join(ComboBox.VALUE_SEPARATOR));
        }

        this.setReadOnly(issue && issue.getIssueStatus() == IssueStatus.CLOSED);
        this.issue = issue;

        return this;
    }

    getButtonRow(): IssueDetailsDialogButtonRow {
        return <IssueDetailsDialogButtonRow>super.getButtonRow();
    }

    private initItemListTogglers(itemList: PublishDialogItemList): boolean {
        // ignore event if there're changes as we're just setting loaded values on list
        const changesMade = itemList.getItemViews().reduce((alreadyMade, itemView) => {
            const toggler = itemView.getIncludeChildrenToggler();
            return (!!toggler && toggler.toggle(this.areChildrenIncludedInIssue(itemView.getContentId()))) || alreadyMade;
        }, false);
        this.ignoreNextExcludeChildrenEvent = changesMade;
        return changesMade;
    }

    protected initActions() {
        super.initActions();

        this.closeAction = new Action(i18n('action.closeIssue'));
        this.closeAction.onExecuted(action => {
            this.detailsSubTitle.setStatus(IssueStatus.CLOSED);
        });
        this.reopenAction = new Action(i18n('action.reopenIssue'));
        this.reopenAction.onExecuted(action => {
            this.detailsSubTitle.setStatus(IssueStatus.OPEN);
        });
        this.publishAction = new ContentPublishDialogAction(this.doPublishAndClose.bind(this, false), i18n('action.publishAndCloseIssue'));

        this.commentAction = new Action(i18n('action.commentIssue'));
        this.commentAction.setEnabled(false).onExecuted(action => {
            const comment = this.commentTextArea.getValue();
            this.skipNextServerUpdatedEvent = true;
            action.setEnabled(false);
            new CommentIssueRequest(this.issue.getId()).setCreator(this.currentUser.getKey()).setText(
                comment).sendAndParse().done(issueComment => {
                this.commentsList.addItem(issueComment);
                this.commentTextArea.setValue('', true).giveFocus();
                action.setEnabled(true);
                api.notify.showFeedback(i18n('notify.issue.commentAdded'));
            });
        });

        this.publishButton = this.createPublishButton();
        this.actionButton = this.publishButton.getActionButton();

        this.errorTooltip = new Tooltip(this.publishButton, i18n('dialog.publish.invalidError'), 500);
        this.errorTooltip.setActive(false);
    }

    protected createHeader(title: string): api.ui.dialog.ModalDialogHeader {
        const header = new IssueDetailsDialogHeader(title);
        header.onTitleChanged((newTitle, oldTitle) => {
            this.debouncedUpdateIssue(this.issue.getIssueStatus(), true);
        });
        return header;
    }

    private createBackButton() {
        const backButton: AEl = new AEl('back-button').setTitle(i18n('dialog.issue.back'));
        this.prependChildToHeader(backButton);
        backButton.onClicked(() => this.close());
    }

    private createCloseButton() {
        const closeButton: DialogButton = this.getButtonRow().addAction(this.closeAction);
        closeButton.addClass('close-issue force-enabled');
    }

    private createReopenButton() {
        const reopenButton: DialogButton = this.getButtonRow().addAction(this.reopenAction);
        reopenButton.addClass('reopen-issue green force-enabled');
    }

    private createAddCommentButton() {
        const commentButton: DialogButton = this.getButtonRow().addAction(this.commentAction);
        commentButton.addClass('comment-issue force-enabled');
    }

    private createPublishButton(): MenuButton {
        const menuButton = this.getButtonRow().makeActionMenu(this.publishAction, [this.showScheduleAction]);
        menuButton.addClass('publish-issue');
        return menuButton;
    }

    private createNoActionMessage() {
        const divEl = new api.dom.DivEl('no-action-message');
        divEl.setHtml(i18n('dialog.issue.noItems'));
        this.getButtonRow().appendChild(divEl);
    }

    private doPublish(scheduled: boolean): wemQ.Promise<void> {

        return this.createPublishContentRequest(scheduled).sendAndParse()
            .then((taskId: api.task.TaskId) => {
                const issue = this.issue;
                const issuePublishedHandler = (taskState: TaskState) => {
                    if (taskState === TaskState.FINISHED) {
                        new UpdateIssueRequest(issue.getId())
                            .setStatus(IssueStatus.CLOSED)
                            .setIsPublish(true)
                            .sendAndParse()
                            .then((updatedIssue: Issue) => {
                                api.notify.showFeedback(i18n('notify.issue.closed', updatedIssue.getTitle()));
                            }).catch(() => {
                            api.notify.showError(i18n('notify.issue.closeError', issue.getTitle()));
                        }).finally(() => {
                            this.unProgressComplete(issuePublishedHandler);
                        });
                    }
                };
                this.onProgressComplete(issuePublishedHandler);
                this.pollTask(taskId);
            }).catch((reason) => {
                this.unlockControls();
                this.close();
                if (reason && reason.message) {
                    api.notify.showError(reason.message);
                    throw reason.message;
                }
            });
    }

    protected countTotal(): number {
        return this.publishProcessor.countTotal();
    }

    protected countDependantItems(): number {
        return this.publishProcessor.getDependantIds().length;
    }

    private doPublishAndClose(scheduled: boolean) {
        return this.doPublish(scheduled).then(() => {
            return this.debouncedUpdateIssue(IssueStatus.CLOSED);
        });
    }

    private doUpdateIssue(newStatus: IssueStatus, autoSave: boolean = false): wemQ.Promise<void> {
        const publishRequest = this.createPublishRequest();
        const statusChanged = newStatus != this.issue.getIssueStatus();

        return new UpdateIssueRequest(this.issue.getId())
            .setTitle(this.header.getTitle())
            .setStatus(newStatus)
            .setAutoSave(autoSave)
            .setApprovers(this.assigneesCombobox.getSelectedDisplayValues().map(o => o.getKey()))
            .setPublishRequest(publishRequest)
            .sendAndParse().then(() => {
                if (statusChanged) {
                    api.notify.showFeedback(i18n('notify.issue.status', IssueStatusFormatter.formatStatus(newStatus)));
                    this.toggleControlsAccordingToStatus(newStatus);
                } else {
                    api.notify.showFeedback(i18n('notify.issue.updated'));
                }
                this.skipNextServerUpdatedEvent = true;
            })
            .catch((reason: any) => api.DefaultErrorHandler.handle(reason));
    }

    private createPublishRequest(): PublishRequest {
        const publishRequestItems = this.publishProcessor.getContentToPublishIds()
            .map(contentId => {
                return PublishRequestItem.create()
                    .setId(contentId)
                    .setIncludeChildren(this.areChildrenIncludedInPublishProcessor(contentId))
                    .build();
            });

        return PublishRequest
            .create(this.issue.getPublishRequest())
            .addExcludeIds(this.publishProcessor.getExcludedIds())
            .setPublishRequestItems(publishRequestItems)
            .build();
    }

    private areChildrenIncludedInIssue(id: ContentId): boolean {
        return this.issue.getPublishRequest().hasItemId(id) &&
               !this.issue.getPublishRequest().getExcludeChildrenIds().some(contentId => contentId.equals(id));
    }

    private areChildrenIncludedInPublishProcessor(id: ContentId): boolean {
        return !this.publishProcessor.getExcludeChildrenIds().some(contentId => contentId.equals(id));
    }

    private createPublishContentRequest(scheduled?: boolean): PublishContentRequest {
        const selectedIds = this.publishProcessor.getContentToPublishIds();
        const excludedIds = this.publishProcessor.getExcludedIds();
        const excludedChildrenIds = this.publishProcessor.getExcludeChildrenIds();

        const publishRequest = new PublishContentRequest()
            .setIds(selectedIds)
            .setExcludedIds(excludedIds)
            .setExcludeChildrenIds(excludedChildrenIds);

        if (scheduled) {
            publishRequest.setPublishFrom(this.getFromDate());
            publishRequest.setPublishTo(this.getToDate());
        }

        return publishRequest;
    }

    protected createItemList(): ListBox<ContentSummaryAndCompareStatus> {
        return new PublishDialogItemList();
    }

    protected createDependantList(): PublishDialogDependantList {
        return new PublishDialogDependantList();
    }

    protected getItemList(): PublishDialogItemList {
        return <PublishDialogItemList>super.getItemList();
    }

    protected getDependantList(): PublishDialogDependantList {
        return <PublishDialogDependantList>super.getDependantList();
    }

    show() {
        super.show();
        // load mask will only be shown if the request is necessary
        this.loadMask.hide();
    }

    close() {
        this.getItemList().clearExcludeChildrenIds();
        (<IssueDetailsDialogHeader> this.header).cancelEdit();
        super.close(false);
    }

    private areSomeItemsOffline(): boolean {
        let summaries: ContentSummaryAndCompareStatus[] = this.getItemList().getItems();
        return summaries.every((summary) => !summary.isOnline());
    }

    protected doScheduledAction() {
        this.doPublish(true);
        this.close();
    }

    protected updateButtonCount(actionString: string, count: number) {
        super.updateButtonCount(actionString, count);

        const labelWithNumber = (num, label) => `${label}${num > 1 ? ` (${num})` : '' }`;
        this.showScheduleAction.setLabel(labelWithNumber(count, i18n('action.scheduleMore')));
    }

    private toggleControlsAccordingToStatus(status: IssueStatus) {
        this.toggleClass('closed', (status == IssueStatus.CLOSED));
    }

    protected isScheduleButtonAllowed(): boolean {
        return this.areSomeItemsOffline();
    }

    protected hasSubDialog(): boolean {
        return true;
    }
}
