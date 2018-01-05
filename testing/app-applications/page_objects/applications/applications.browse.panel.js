const page = require('../page');
const elements = require('../../libs/elements');
const appConst = require('../../libs/app_const');

const XPath = {
    toolbar: `//div[contains(@id,'ApplicationBrowseToolbar')]`,
    installButton: `//div[contains(@id,'ApplicationBrowseToolbar')]/button[contains(@id, 'ActionButton') and child::span[contains(.,'Install')]]`,
    unInstallButton: `//div[contains(@id,'ApplicationBrowseToolbar')]/button[contains(@id, 'ActionButton') and child::span[contains(.,'Uninstall')]]`,
    stopButton: `//div[contains(@id,'ApplicationBrowseToolbar')]/button[contains(@id, 'ActionButton') and child::span[contains(.,'Stop')]]`,
    startButton: `//div[contains(@id,'ApplicationBrowseToolbar')]/button[contains(@id, 'ActionButton') and child::span[contains(.,'Start')]]`,
    rowByName: name => `//div[contains(@id,'NamesView') and child::p[contains(@class,'sub-name') and contains(.,'${name}')]]`,
    rowByDisplayName:
        displayName => `//div[contains(@id,'NamesView') and child::h6[contains(@class,'main-name') and contains(.,'${displayName}')]]`,
    checkboxByDisplayName: displayName => `${elements.itemByDisplayName(
        displayName)}/ancestor::div[contains(@class,'slick-row')]/div[contains(@class,'slick-cell-checkboxsel')]/label`
};

module.exports = Object.create(page, {
    waitForPanelVisible: {
        value: function (ms) {
            return this.waitForVisible(XPath.toolbar, ms).catch(() => {
                throw new Error(`Content browse panel was not loaded in  ${ms}`);
            });
        }
    },
    isItemDisplayedByDisplayName: {
        value: function (itemName) {
            return this.waitForVisible(`${XPath.rowByDisplayName(itemName)}`, 1000).catch(() => {
                console.log("item is not displayed:" + itemName);
                this.saveScreenshot(`err_find_${itemName}`);
                throw new Error(`Item was not found! ${itemName}`);
            });
        }
    },
    isItemDisplayed: {
        value: function (itemName) {
            return this.waitForVisible(XPath.rowByName(itemName), 1000).catch(() => {
                console.log("item is not displayed:" + itemName);
                this.saveScreenshot(`err_find_${itemName}`);
                throw new Error(`Item was not found!  ${itemName}`);
            });
        }
    },
    waitForItemNotDisplayed: {
        value: function (itemName) {
            return this.waitForNotVisible(XPath.rowByName(itemName), 1000).catch(() => {
                console.log("item is still displayed:" + itemName);
                return false;
            });
        }
    },
    waitForGridLoaded: {
        value: function (ms) {
            return this.waitForVisible(`${elements.GRID_CANVAS}`, ms).then(() => {
                return this.waitForSpinnerNotVisible(appConst.TIMEOUT_3);
            }).then(() => {
                return console.log('applications browse panel is loaded')
            }).catch(err => {
                throw new Error(`applications browse panel not loaded in ${ms}`);
            });
        }
    },

    clickOnInstallButton: {
        value: function () {
            return this.waitForEnabled(XPath.installButton, 1000).then(() => {
                return this.doClick(XPath.installButton);
            }).catch((err) => {
                throw new Error(`Install button is not enabled! ${err}`);
            })
        }
    },
    clickOnUninstallButton: {
        value: function () {
            return this.waitForEnabled(XPath.installButton, 1000).then(() => {
                return this.doClick(XPath.unInstallButton);
        }).catch((err) => {
                throw new Error(`Uninstall button is not enabled! ${err}`);
        })
        }
    },
    clickOnStartButton: {
        value: function () {
            return this.waitForEnabled(XPath.startButton, 1000)
                .then(enabled => enabled ? this.doClick(XPath.startButton) : Promise.reject(''))
                .catch(() => {
                    this.saveScreenshot('err_browsepanel_start');
                    throw new Error(`Start button is disabled!`);
                });
        }
    },
    clickOnStopButton: {
        value: function () {
            return this.waitForEnabled(XPath.stopButton, 1000)
                .then(enabled => enabled ? this.doClick(XPath.stopButton) : Promise.reject(''))
                .catch(() => {
                    this.saveScreenshot('err_browsepanel_stop');
                    throw new Error(`Stop button is disabled!`);
                });
        }
    },
    waitForStopButtonEnabled: {
        value: function () {
            return this.waitForEnabled(XPath.stopButton, 2000);
        }
    },
    waitForUninstallButtonEnabled: {
        value: function () {
            return this.waitForEnabled(XPath.unInstallButton, 3000);
        }
    },
    isInstallButtonEnabled: {
        value: function () {
            return this.isEnabled(XPath.installButton);
        }
    },
    isUnInstallButtonEnabled: {
        value: function () {
            return this.isEnabled(XPath.unInstallButton);
        }
    },
    isStartButtonEnabled: {
        value: function () {
            return this.isEnabled(XPath.startButton);
        }
    },
    isStopButtonEnabled: {
        value: function () {
            return this.isEnabled(XPath.stopButton);
        }
    },
    clickOnRowByName: {
        value: function (name) {
            const nameXpath = XPath.rowByName(name);
            return this.waitForVisible(nameXpath, 2000).then(() => {
                return this.doClick(nameXpath);
            }).pause(400).catch(() => {
                this.saveScreenshot(`err_find_${name}`);
                throw Error(`Row with the name ${name} was not found.`)
            })
        }
    },
    rightClickOnRowByDisplayName: {
        value: function (name) {
            const nameXpath = XPath.rowByDisplayName(name);
            return this.waitForVisible(nameXpath, 3000).then(() => {
                return this.doRightClick(nameXpath);
        }).pause(400).catch(() => {
            this.saveScreenshot(`err_find_${name}`);
            throw Error(`Row with the name ${name} was not found`);
        })
        }
    },
    clickOnRowByDisplayName: {
        value: function (displayName) {
            const displaNameXPath = XPath.rowByDisplayName(displayName);
            return this.waitForVisible(displaNameXPath, 2000)
                .then(() => this.doClick(displaNameXPath))
                .pause(400)
                .catch(() => {
                    this.saveScreenshot(`err_find_${displayName}`);
                    throw Error(`Row with the name ${displayName} was not found.`);
                });
        }
    },
    waitForRowByNameVisible: {
        value: function (name) {
            const nameXpath = XPath.rowByName(name);
            return this.waitForVisible(nameXpath, 3000)
                .catch(() => {
                    this.saveScreenshot(`err_find_${name}`);
                    throw Error(`Row with the name ${name} is not visible in 3000ms.`)
                })
        }
    },
    clickCheckboxAndSelectRowByDisplayName: {
        value: function (displayName) {
            const displayNameXpath = XPath.checkboxByDisplayName(displayName);
            return this.waitForVisible(displayNameXpath, 2000).then(() => {
                return this.doClick(displayNameXpath);
            }).catch(() => {
                this.saveScreenshot('err_find_item');
                throw Error(`Row with the displayName ${displayName} was not found.`)
            })
        }
    },
    isAppByDisplayNameInstalled: {
        value: function (displayName) {
            const displayNameXPath = XPath.rowByDisplayName(displayName);
            return this.element(displayNameXPath).then(el => (el.value != null));
        }
    }
});
