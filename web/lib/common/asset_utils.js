import assetConstants from "../chain/asset_constants";

export default class AssetUtils {

    static getFlagBooleans(mask, isBitAsset = false) {
        let booleans = {
            charge_market_fee    : false,
            white_list           : false,
            override_authority   : false,
            transfer_restricted  : false,
            disable_force_settle : false,
            global_settle        : false,
            disable_confidential : false,
            witness_fed_asset    : false,
            committee_fed_asset  : false
        }

        if (mask === "all") {
            for (let flag in booleans) {
                if (!isBitAsset && (assetConstants.uia_permission_mask.indexOf(flag) === -1)) {
                    delete booleans[flag];
                } else {
                    booleans[flag] = true;
                }
            }
            return booleans;
        }

        for (let flag in booleans) {
            if (!isBitAsset && (assetConstants.uia_permission_mask.indexOf(flag) === -1)) {
                delete booleans[flag];
            } else {
                if (mask & assetConstants.permission_flags[flag]) {
                    booleans[flag] = true;
                }
            }
        }

        return booleans;
    }

    static getFlags(flagBooleans) {
        let keys = Object.keys(assetConstants.permission_flags);

        let flags = 0;

        keys.forEach(key => {
            if (flagBooleans[key] && key !== "global_settle") {
                flags += assetConstants.permission_flags[key];
            }
        })

        return flags;
    }

    static getPermissions(flagBooleans, isBitAsset = false) {
        let permissions = isBitAsset ? Object.keys(assetConstants.permission_flags) : assetConstants.uia_permission_mask;
        let flags = 0;
        permissions.forEach(permission => {
            if (flagBooleans[permission] && permission !== "global_settle") {
                flags += assetConstants.permission_flags[permission];
            }
        })

        if (isBitAsset) {
            flags += assetConstants.permission_flags["global_settle"];
        }

        return flags;
    }

    static parseDescription(description) {
        let parsed;
        try {
            parsed = JSON.parse(description)
        } catch (error) {

        }

        return parsed ? parsed : {main: description};
    }

    static ol_description_for_assets(asset_name) {
        switch(asset_name){
            case "OBITS":
                return `OBITS<br>
OpenLedger ApS (Denmark, part of EU) backed user issued asset (UIA) <br>
www.obits.io<br>
OBITS is the official digital token of the OpenLedger DC allowing multiple organizations to join forces and directly invest in each other’s successes, reaping the benefits of cross-promotion throughout the entire network. OBITS benefit directly from www.BloggersClub.net , OpenLedger exchange as well as the digital tokens like ICOO, BTSR, BLOCKPAY, APPX, CNTZ, REALITY, OPEN.`;
            case "ICOO":
                return `ICOO<br>
OpenLedger ApS (Denmark, part of EU) backed user issued asset (UIA)<br>
www.icoo.io<br>
Investing in ICOOs = Investing in ALL ITOs on OpenLedger. When you are Investing in ICOO, you are in fact investing in all ITO's (Initial Token Offering) introduced on OpenLedger DC, whether they are external ITO pre-launches or ITO's on OpenLedger DC. Initially minimum 2% dividend in monthly payouts based on coinmarketcap average of the month. The intention is dividend and sharing of profits as end goal.`;
            case "BTSR":
                return `BTSR<br>
OpenLedger ApS (Denmark, part of EU) backed user issued asset (UIA)<br>
www.btsr.io<br>
HubDSP.com is a DSP advertising service using real time bidding (RTB) powered by a digital token with the abbreviation “BTSR”. 
BTSR is OpenLedger’s solution to advertising credits on the blockchain. The network infrastructure allows users to earn tokens by blogging, selling ads, and being an active community member.`;
            default:
                return "";
        }
    }
}
