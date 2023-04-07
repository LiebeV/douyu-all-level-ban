// ==UserScript==
// @name         斗鱼全等级弹幕屏蔽
// @namespace    https://www.liebev.site
// @version      1.0.1
// @description  douyu斗鱼，高级弹幕屏蔽，突破30级等级屏蔽限制，房管模拟器
// @author       LiebeV
// @license      MIT: Copyright (c) 2023 LiebeV
// @match        https://www.douyu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=douyu.com
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

'use strict';

// 更新日志，根据反馈，更改了bannedIds的保留逻辑，现在添加的ID将会在所有直播间保留生效
// 已知问题，弹幕瞬间过多时，rightMO会挂
// 更新计划，添加移除id的功能


let bannedIds = GM_getValue('bannedIds', []);
const userBannedIds = bannedIds;
let dmCache = [];

//尝试获取弹幕区
async function getRightList() {
    // console.log('高级弹幕屏蔽初始化成功');
    let ulList;
    let count = 0;
    while (!ulList && count < 20) {
        ulList = document.getElementById("js-barrage-list");
        console.log('尝试获取弹幕区...');
        if (!ulList) {
            console.log(`失败，等待1秒钟再尝试获取，剩余重试：${20 - count}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            count++;
        }
    }
    if (!ulList) {
        console.log('无法获取Right弹幕区，请刷新网页');
    } else {
        console.log('已获Right取弹幕区，准备开启rightMO感知');
        console.log(ulList);
    }
    return ulList;
}

// 右侧 mutation observer
async function rightMO() {
    const ulList = await getRightList();
    //    console.log('Right感知准备完成');
    const rightObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (righNode) {
                if (righNode.nodeName === 'LI') {
                    // console.log('\x1b[32m%s\x1b[0m', 'Right弹幕区感知到新弹幕：');
                    // console.log(righNode);
                    rightCheck(righNode);
                }
            });
        });
    });
    const config = { childList: true };
    rightObserver.observe(ulList, config);
    console.log('Right感知挂载完成，等待新弹幕...');
}

// 检查id，获取发言内容，right2mid
async function rightCheck(righNode) {
    const userId = righNode.querySelector("span.Barrage-nickName[title]").getAttribute("title");
    if (userBannedIds.includes(userId)) {
        righNode.style.display = 'none';
        const danmu = righNode.querySelector("span.Barrage-content").textContent.trim();
        // console.log("rightcheck:" + danmu);
        if (dmCache.includes(danmu)) {
            const xpath = `//div[contains(text(), "${danmu}")]`;
            // const midDivElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const snapshotResult = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < snapshotResult.snapshotLength; i++) {
                const midDivElement = snapshotResult.snapshotItem(i);
                midDivElement.parentElement.style.display = 'none';
            }
        }
        console.log(`"${userId}" 的发言已被屏蔽!`);
    }
}

// 获取飘屏弹幕区
async function getMainList() {
    let divList;
    let count = 0;
    // 尝试等待页面加载 20s
    while (!divList && count < 20) {
        divList = document.querySelector('.danmu-e7f029');
        if (!divList) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            count++;
        }
    }
    if (!divList) {
        console.log('无法获取飘屏弹幕区，请刷新网页');
    } else {
        console.log('已获取飘屏弹幕区，准备开启Mutation感知');
        console.log(divList);
    }
    return divList;
}

// 飘屏mutation observer
async function midMO() {
    const middivList = await getMainList();
    // console.log('mid感知准备完成');
    const midObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (midNode) {
                if (midNode.nodeName === 'DIV') {
                    // console.log('\x1b[32m%s\x1b[0m', '飘屏区感知到新弹幕：');
                    // console.log(midNode);
                    getMidText(midNode);
                }
            });
        });
    });
    const midConfig = { childList: true };
    midObserver.observe(middivList, midConfig);
    console.log('mid感知挂载完成，等待新弹幕...');
}

// 获取飘屏区弹幕内容，存入临时数组，等待比对
async function getMidText(midNode) {
    const midText = midNode.querySelector("div.text-edf4e7").textContent;
    // console.log(midText);
    dmCache.push(midText);
    // console.log(dmCache);
    if (dmCache.length > 10) {
        dmCache.splice(0, dmCache.length);
    }
}

//通过setValue像存储器添加id
async function addId(userIdInput) {
    // console.log('addId接收到传入');
    if (!bannedIds.includes(userIdInput)) {
        bannedIds.push(userIdInput);
        console.log(`已添加屏蔽用户： ${userIdInput}`);
        GM_setValue('bannedIds', bannedIds);
    } else {
        console.log('添加失败');
    }
}

async function showSettings() {
    let message = "当前被您屏蔽的用户ID列表：\n";
    const idList = GM_getValue('bannedIds', []);
    for (let i = 0; i < idList.length; i++) {
        message += `${i + 1}. ${idList[i]}\n`;
    }
    const userIdInput = prompt(`${message}\n请输入要屏蔽发言的用户id`);
    if (userIdInput) {
        console.log('接收到用户id');
        addId(userIdInput);
    }
}

GM_registerMenuCommand('添加屏蔽用户', showSettings);

(function () {
    rightMO();
    midMO();
})();
