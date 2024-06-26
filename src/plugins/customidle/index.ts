/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Notices } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    idleTimeout: {
        description: "Minutes before Discord goes idle (0 to disable auto-idle)",
        type: OptionType.SLIDER,
        markers: makeRange(0, 60, 5),
        default: 10,
        stickToMarkers: false
    },
    remainInIdle: {
        description: "When you come back to Discord, remain idle until you confirm you want to go online",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let sentNotif = false;
export default definePlugin({
    name: "CustomIdle",
    description: "Allows you to set the time before Discord goes idle (or disable auto-idle)",
    authors: [Devs.newwares],
    settings,
    patches: [
        {
            find: "IDLE_DURATION:function(){return",
            replacement: {
                match: /(IDLE_DURATION:function\(\){return )\i/,
                replace: "$1$self.getIdleTimeout()"
            }
        },
        {
            find: "type:\"IDLE\",idle:",
            replacement: [
                {
                    match: /Math\.min\((\i\.AfkTimeout\.getSetting\(\)\*\i\.default\.Millis\.SECOND),\i\.IDLE_DURATION\)/,
                    replace: "$1" // decouple idle from afk (phone notifs will remain at 10 mins)
                },
                {
                    match: /\i\.default\.dispatch\({type:"IDLE",idle:!1}\)/,
                    replace: "$self.handleOnline()"
                }
            ]
        }
    ],
    handleOnline() { // might be called in quick succession
        if (!settings.store.remainInIdle) {
            FluxDispatcher.dispatch({
                type: "IDLE",
                idle: false
            });
            return;
        }
        if (!sentNotif) {
            sentNotif = true;
            Notices.showNotice("Welcome back! Click the button to go online. Click the X to stay idle until reload.", "Exit idle", () => {
                Notices.popNotice();
                FluxDispatcher.dispatch({
                    type: "IDLE",
                    idle: false
                });
                sentNotif = false;
            });
        }
    },
    getIdleTimeout() { // milliseconds, default is 6e5
        const { idleTimeout } = settings.store;
        return idleTimeout===0?Number.MAX_SAFE_INTEGER:idleTimeout*60000;
    },
    start() {
        sentNotif=false;
    }
});
