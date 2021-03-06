/**
 * Created on 12/2/2017.
 */
const launcherPanel = require('../page_objects/launcher.panel');
const homePage = require('../page_objects/home.page');
const loginPage = require('../page_objects/login.page');
const browsePanel = require('../page_objects/browsepanel/content.browse.panel');
const wizard = require('../page_objects/wizardpanel/content.wizard.panel');
const filterPanel = require("../page_objects/browsepanel/content.filter.panel");
const confirmationDialog = require("../page_objects/confirmation.dialog");
const appConst = require("./app_const");
const newContentDialog = require('../page_objects/browsepanel/new.content.dialog');
const contentWizardPanel = require('../page_objects/wizardpanel/content.wizard.panel');
const webDriverHelper = require("./WebDriverHelper");
const issueListDialog = require('../page_objects/issue/issue.list.dialog');
const createIssueDialog = require('../page_objects/issue/create.issue.dialog');
const deleteContentDialog = require('../page_objects/delete.content.dialog');
const confirmContentDeleteDialog = require('../page_objects/confirm.content.delete.dialog');


module.exports = {
    xpTabs: {},
    doCloseCurrentBrowserTab: function () {
        return webDriverHelper.browser.getTitle().then(title=> {
            if (title != 'Enonic XP Home') {
                return webDriverHelper.browser.close();
            }
        })
    },
    openIssuesListDialog: function () {
        return browsePanel.clickOnShowIssuesListButton().then(()=> {
            return issueListDialog.waitForDialogVisible();
        })
    },
    openCreateIssueDialog: function () {
        return browsePanel.clickOnShowIssuesListButton().then(()=> {
            return issueListDialog.waitForDialogVisible(500);
        }).then(()=> {
            return issueListDialog.clickOnNewIssueButton();
        }).then(()=> {
            return createIssueDialog.waitForDialogLoaded();
        });
    },
    openContentWizard: function (contentType) {
        return browsePanel.waitForNewButtonEnabled(appConst.TIMEOUT_3).then(()=> {
            return browsePanel.clickOnNewButton();
        }).then(()=> {
            return newContentDialog.waitForOpened();
        }).then(()=> {
            return newContentDialog.clickOnContentType(contentType);
        }).then(()=> {
            return this.doSwitchToNewWizard();
        }).then(()=> {
            return contentWizardPanel.waitForOpened();
        })
    },

    doAddShortcut: function (shortcut) {
        return this.openContentWizard(appConst.contentTypes.SHORTCUT).then(()=> {
            return contentWizardPanel.typeData(shortcut);
        }).then(()=> {
            return contentWizardPanel.waitAndClickOnSave();
        }).then(()=> {
            return this.doCloseWizardAndSwitchToGrid()
        }).pause(1000);
    },
    doAddFolder: function (folder) {
        return this.openContentWizard(appConst.contentTypes.FOLDER).then(()=> {
            return contentWizardPanel.typeData(folder);
        }).then(()=> {
            return contentWizardPanel.waitAndClickOnSave();
        }).then(()=> {
            return this.doCloseWizardAndSwitchToGrid()
        }).pause(1000);
    },
    doCloseWizardAndSwitchToGrid: function () {
        return this.doCloseCurrentBrowserTab().then(()=> {
            return this.doSwitchToContentBrowsePanel(webDriverHelper.browser);
        });
    },
    doAddSite: function (site) {
        return this.openContentWizard(appConst.contentTypes.SITE).then(()=> {
            return contentWizardPanel.typeData(site);
        }).then(()=> {
            return contentWizardPanel.waitAndClickOnSave();
        }).then(()=> {
            return this.doCloseCurrentBrowserTab();
        }).then(()=> {
            return this.doSwitchToContentBrowsePanel(webDriverHelper.browser);
        }).pause(2000);
    },
    doOpenSiteWizard: function () {
        return this.openContentWizard(appConst.contentTypes.SITE);
    },
    doOpenPageTemplateWizard: function (siteName) {
        return this.typeNameInFilterPanel(siteName).then(()=> {
            return browsePanel.waitForContentDisplayed(siteName);
        }).then(()=> {
            return browsePanel.clickOnExpanderIcon(siteName);
        }).pause(1000).then(()=> {
            return browsePanel.clickCheckboxAndSelectRowByName('Templates');
        }).pause(500).then(()=> {
            return browsePanel.clickOnNewButton();
        }).then(()=> {
            return this.doSwitchToNewWizard();
        }).then(()=> {
            return contentWizardPanel.waitForOpened();
        });
    },

    doAddArticleContent: function (siteName, article) {
        return this.findAndSelectItem(siteName).then(()=> {
            return this.openContentWizard(article.contentType);
        }).then(()=> {
            return contentWizardPanel.typeData(article);
        }).then(()=> {
            return contentWizardPanel.waitAndClickOnSave();
        }).then(()=> {
            return this.doCloseCurrentBrowserTab();
        }).then(()=> {
            this.doSwitchToContentBrowsePanel(webDriverHelper.browser);
        }).pause(2000);
    },
    findAndSelectItem: function (name) {
        return this.typeNameInFilterPanel(name).then(()=> {
            return browsePanel.waitForRowByNameVisible(name);
        }).pause(400).then(()=> {
            return browsePanel.clickOnRowByName(name);
        });
    },
    selectContentAndOpenWizard: function (name) {
        return this.findAndSelectItem(name).then(()=> {
            return browsePanel.waitForEditButtonEnabled();
        }).then(()=> {
            return browsePanel.clickOnEditButton();
        }).then(()=> {
            return this.doSwitchToNewWizard();
        }).then(()=> {
            return contentWizardPanel.waitForOpened();
        })
    },
    findContentAndClickCheckBox: function (displayName) {
        return this.typeNameInFilterPanel(name).then(()=> {
            return browsePanel.waitForRowByNameVisible(name);
        }).pause(400).then(()=> {
            return browsePanel.clickCheckboxAndSelectRowByDisplayName(displayName);
        });
    },
    selectSiteAndOpenNewWizard: function (siteName, contentType) {
        return this.findAndSelectItem(siteName).then(()=> {
            return browsePanel.waitForNewButtonEnabled();
        }).then(()=> {
            return browsePanel.clickOnNewButton();
        }).then(()=> {
            return newContentDialog.waitForOpened();
        }).then(()=> {
            return newContentDialog.typeSearchText(contentType);
        }).then(()=> {
            return newContentDialog.clickOnContentType(contentType);
        }).then(()=> {
            return this.doSwitchToNewWizard();
        }).then(()=> {
            return contentWizardPanel.waitForOpened();
        });
    },
    clickOnDeleteAndConfirm: function (numberOfContents) {
        return browsePanel.clickOnDeleteButton().then(()=> {
            return deleteContentDialog.waitForDialogVisible(1000);
        }).then(()=> {
            return deleteContentDialog.clickOnDeleteButton();
        }).then(()=> {
            return confirmContentDeleteDialog.waitForDialogVisible();
        }).then(()=> {
            return confirmContentDeleteDialog.typeNumberOfContent(numberOfContents);
        }).pause(700).then(()=> {
            return confirmContentDeleteDialog.clickOnConfirmButton();
        }).then(()=> {
            return deleteContentDialog.waitForDialogClosed();
        })
    },
    typeNameInFilterPanel: function (name) {
        return filterPanel.isPanelVisible().then((result)=> {
            if (!result) {
                return browsePanel.clickOnSearchButton().then(()=> {
                    return filterPanel.waitForOpened();
                })
            }
            return;
        }).then(()=> {
            return filterPanel.typeSearchText(name);
        }).catch((err)=> {
            throw new Error(err);
        }).then(()=> {
            return browsePanel.waitForSpinnerNotVisible(appConst.TIMEOUT_3);
        });
    },
    selectAndDeleteItem: function (name) {
        return this.findAndSelectItem(name).pause(500).then(()=> {
            return browsePanel.waitForDeleteButtonEnabled();
        }).then((result)=> {
            return browsePanel.clickOnDeleteButton();
        }).then(()=> {
            return confirmationDialog.waitForDialogVisible(appConst.TIMEOUT_3);
        }).then(result=> {
            if (!result) {
                throw new Error('Confirmation dialog is not loaded!')
            }
            return confirmationDialog.clickOnYesButton();
        }).then(()=> {
            return browsePanel.waitForSpinnerNotVisible();
        })
    },
    confirmDelete: ()=> {
        return confirmationDialog.waitForDialogVisible(appConst.TIMEOUT_3).then(()=> {
            return confirmationDialog.clickOnYesButton();
        }).then(()=> {
            return browsePanel.waitForSpinnerNotVisible();
        });
    },

    navigateToContentStudioApp: function (browser) {
        return launcherPanel.waitForPanelVisible(appConst.TIMEOUT_3).then((result)=> {
            if (result) {
                console.log("Launcher Panel is opened, click on the `Content Studio` link...");
                return launcherPanel.clickOnContentStudioLink();
            } else {
                console.log("Login Page is opened, type a password and name...");
                return this.doLoginAndClickOnContentStudio(browser);
            }
        }).then(()=> {
            return this.doSwitchToContentBrowsePanel(browser);
        }).catch((err)=> {
            console.log('tried to navigate to Content Studio app, but: ' + err);
            this.saveScreenshot(appConst.generateRandomName("err_navigate_to_studio"));
            throw new Error('error when navigated to studio ' + err);
        })
    },
    doLoginAndClickOnContentStudio: function (browser) {
        return loginPage.doLogin().pause(900).then(()=> {
            return homePage.waitForXpTourVisible(appConst.TIMEOUT_1);
        }).then((result)=> {
            if (result) {
                return homePage.doCloseXpTourDialog();
            }
        }).then(()=> {
            return launcherPanel.clickOnContentStudioLink().pause(1000);
        })
    },

    doSwitchToContentBrowsePanel: function (browser) {
        console.log('testUtils:switching to Content Studio app...');
        return browser.getTitle().then(title=> {
            if (title != "Content Studio - Enonic XP Admin") {
                return this.switchToStudioTabWindow(browser);
            }
        })
    },

    doSwitchToHome: function (browser) {
        console.log('testUtils:switching to Home page...');
        return browser.getTabIds().then(tabs => {
            let prevPromise = Promise.resolve(false);
            tabs.some((tabId)=> {
                prevPromise = prevPromise.then((isHome) => {
                    if (!isHome) {
                        return this.switchAndCheckTitle(browser, tabId, "Enonic XP Home");
                    }
                    return false;
                });
            });
            return prevPromise;
        }).then(()=> {
            return homePage.waitForLoaded(appConst.TIMEOUT_3);
        });
    },
    doSwitchToNewWizard: function () {
        console.log('testUtils:switching to the new wizard tab...');
        return webDriverHelper.browser.getTabIds().then(tabs => {
            this.xpTabs = tabs;
            return webDriverHelper.browser.switchTab(this.xpTabs[this.xpTabs.length - 1]);
        }).then(()=> {
            return contentWizardPanel.waitForOpened();
        });
    },
    switchAndCheckTitle: function (browser, tabId, reqTitle) {
        return browser.switchTab(tabId).then(()=> {
            return browser.getTitle().then(title=> {
                return title == reqTitle;
            })
        });
    },
    doLoginAndSwitchToContentStudio: function (browser) {
        return loginPage.doLogin().pause(1000).then(()=> {
            return homePage.waitForXpTourVisible(appConst.TIMEOUT_3);
        }).then((result)=> {
            if (result) {
                return homePage.doCloseXpTourDialog();
            }
        }).then(()=> {
            return launcherPanel.clickOnContentStudioLink().pause(1000);
        }).then(()=> {
            return this.doSwitchToContentBrowsePanel(browser);
        }).catch((err)=> {
            throw new Error(err);
        })
    },
    doCloseWindowTabAndSwitchToBrowsePanel: function (browser) {
        return browser.close().pause(300).then(()=> {
            return this.doSwitchToContentBrowsePanel(browser);
        })
    },

    saveAndCloseWizard: function (displayName) {
        return wizard.waitAndClickOnSave().pause(300).then(()=> {
            return this.doCloseWindowTabAndSwitchToBrowsePanel()
        })
    },
    switchToStudioTabWindow: function (browser) {
        return browser.getTabIds().then(tabs => {
            let prevPromise = Promise.resolve(false);
            tabs.some((tabId)=> {
                prevPromise = prevPromise.then((isStudio) => {
                    if (!isStudio) {
                        return this.switchAndCheckTitle(browser, tabId, "Content Studio - Enonic XP Admin");
                    }
                    return false;
                });
            });
            return prevPromise;
        }).then(()=> {
            return browsePanel.waitForGridLoaded(appConst.TIMEOUT_3);
        });
    },
    doPressBackspace: function () {
        return webDriverHelper.browser.keys('\uE003');
    },
    doCloseAllWindowTabsAndSwitchToHome: function (browser) {
        return browser.getTabIds().then(tabIds=> {
            let result = Promise.resolve();
            tabIds.forEach((tabId)=> {
                result = result.then(() => {
                    return this.switchAndCheckTitle(browser, tabId, "Enonic XP Home");
                }).then((result)=> {
                    if (!result) {
                        return browser.close().then(()=> {
                            //return this.doSwitchToHome(browser);
                        });
                    }
                });
            });
            return result;
        }).then(()=> {
            return this.doSwitchToHome(browser);
        });
    },
    saveScreenshot: function (name) {
        var path = require('path')
        var screenshotsDir = path.join(__dirname, '/../build/screenshots/');
        return webDriverHelper.browser.saveScreenshot(screenshotsDir + name + '.png').then(()=> {
            return console.log('screenshot saved ' + name);
        }).catch(err=> {
            return console.log('screenshot was not saved ' + screenshotsDir + 'utils  ' + err);
        })
    }
};
