import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";
import CachedPropertyActions from "actions/CachedPropertyActions";
import ApplicationApi from "api/ApplicationApi";
import {TransactionBuilder, FetchChain} from "bitsharesjs/es";
import {Apis} from "bitsharesjs-ws";
import alt from "alt-instance";
import SettingsStore from "stores/SettingsStore";

let application_api = new ApplicationApi();

function xhr_promise(req_obj) {

    let { address, account_name, referrer, active_private, referrer_percent, owner_private, refcode, registrar } = req_obj;

    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', address, true); // 'your api adress'
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader('Content-Type', "application/json");
        xhr.onreadystatechange = function() {
            if (this.readyState != 4) return;
            var ans = JSON.parse(this.responseText);

            if (!ans || (ans && ans.error)) {
                reject(ans);
            } else {
                resolve(ans);
            }
        }
        //console.log('@>owner_private',owner_private)

        let message = JSON.stringify({
            "account": {
                "name": account_name,
                "owner_key": owner_private.toPublicKey().toPublicKeyString(),
                "active_key": active_private.toPublicKey().toPublicKeyString(),
                "memo_key": active_private.toPublicKey().toPublicKeyString(),
                //"memo_key": memo_private.private_key.toPublicKey().toPublicKeyString(),
                "refcode": refcode,
                "referrer": referrer
            }
        });
        xhr.send(message);     
    });
}

class WalletActions {

    /** Restore and make active a new wallet_object. */
    restore(wallet_name = "default", wallet_object) {
        wallet_name = wallet_name.toLowerCase();
        return {wallet_name, wallet_object};
    }

    /** Make an existing wallet active or create a wallet (and make it active).
        If <b>wallet_name</b> does not exist, provide a <b>create_wallet_password</b>.
    */
    setWallet(wallet_name, create_wallet_password, brnkey) {
        WalletUnlockActions.lock();
        if( !wallet_name) wallet_name = "default";
        return (dispatch) => {
            return new Promise( resolve => {
                dispatch({wallet_name, create_wallet_password, brnkey, resolve});
            });
        };
    }

    setBackupDate() {
        CachedPropertyActions.set("backup_recommended", false);
        return true;
    }

    setBrainkeyBackupDate() {
        return true;
    }

    createAccountWithPassword( account_name, password, registrar, referrer, referrer_percent, refcode ) {
        let {privKey : owner_private} = WalletDb.generateKeyFromPassword(account_name, "owner", password);
        let {privKey: active_private} = WalletDb.generateKeyFromPassword(account_name, "active", password);
        console.log("create account:", account_name);
        console.log("new active pubkey", active_private.toPublicKey().toPublicKeyString());
        console.log("new owner pubkey", owner_private.toPublicKey().toPublicKeyString());

        return new Promise((resolve, reject) => {
            let create_account = () => {
                return application_api.create_account(
                    owner_private.toPublicKey().toPublicKeyString(),
                    active_private.toPublicKey().toPublicKeyString(),
                    account_name,
                    registrar, //registrar_id,
                    referrer, //referrer_id,
                    referrer_percent, //referrer_percent,
                    true //broadcast
                ).then(resolve).catch(reject);
            };

            if(registrar) {
                // using another user's account as registrar
                return create_account();
            } else {
                // using faucet

                let faucetAddress = SettingsStore.getSetting("faucet_address");
                if (window && window.location && window.location.protocol === "https:") {
                    faucetAddress = faucetAddress.replace(/http:\/\//, "https://");
                }

                //console.log('@>owner_private',owner_private)

                xhr_promise({
                    address:faucetAddress + "/api/v1/accounts",
                    owner_private,
                    active_private,
                    account_name,
                    referrer,
                    referrer_percent,
                    refcode,
                    registrar
                }).then(result => {
                    if (result && result.error) {
                        reject(result.error);
                    } else {
                        resolve(result);
                    }
                }).catch(error => {
                    reject(error);
                });
            }
        });

    }

    createAccount( account_name, registrar, referrer, referrer_percent, refcode ) {
        if( WalletDb.isLocked()) {
            let error = "wallet locked";
            //this.actions.brainKeyAccountCreateError( error )
            return Promise.reject( error );
        }
        let owner_private = WalletDb.generateNextKey();
        let active_private = WalletDb.generateNextKey();
        //let memo_private = WalletDb.generateNextKey()
        let updateWallet = () => {
            let transaction = WalletDb.transaction_update_keys();
            let p = WalletDb.saveKeys(
                [ owner_private, active_private],
                //[ owner_private, active_private, memo_private ],
                transaction
            );
            return p;
        };

        let create_account = () => {
            return application_api.create_account(
                owner_private.private_key.toPublicKey().toPublicKeyString(),
                active_private.private_key.toPublicKey().toPublicKeyString(),
                account_name,
                registrar, //registrar_id,
                referrer, //referrer_id,
                referrer_percent, //referrer_percent,
                true //broadcast
            ).then( () => updateWallet() );
        };

        if(registrar) {
            // using another user's account as registrar
            return create_account();
        } else {
            // using faucet

            let faucetAddress = SettingsStore.getSetting("faucet_address");
            if (window && window.location && window.location.protocol === "https:") {
                faucetAddress = faucetAddress.replace(/http:\/\//, "https://");
            }

            return xhr_promise({
                    address:faucetAddress + "/api/v1/accounts",
                    owner_private:owner_private.private_key,
                    active_private:active_private.private_key,
                    account_name,
                    referrer,
                    referrer_percent,
                    refcode,
                    registrar
            }).then(result => {
                //console.log('@>result',result)
                if (result.error) {
                    throw result.error;
                }
                return updateWallet();
            }).catch(error => {
                //console.log('@>',error)
                /*
                * Since the account creation failed, we need to decrement the
                * sequence used to generate private keys from the brainkey. Two
                * keys were generated, so we decrement twice.
                */
                WalletDb.decrementBrainKeySequence();
                WalletDb.decrementBrainKeySequence();
                throw error;
            });
        }
    }

    claimVestingBalance(account, cvb, forceAll = false) {
        let tr = new TransactionBuilder();

        let balance = cvb.balance.amount,
            earned = cvb.policy[1].coin_seconds_earned,
            vestingPeriod = cvb.policy[1].vesting_seconds,
            availablePercent = forceAll ? 1 : earned / (vestingPeriod * balance);

        tr.add_type_operation("vesting_balance_withdraw", {
            fee: { amount: "0", asset_id: "1.3.0"},
            owner: account,
            vesting_balance: cvb.id,
            amount: {
                amount: Math.floor(balance * availablePercent),
                asset_id: cvb.balance.asset_id
            }
        });

        return WalletDb.process_transaction(tr, null, true)
        .then(result => {

        })
        .catch(err => {
            console.log("vesting_balance_withdraw err:", err);
        });
    }

    /** @parm balances is an array of balance objects with two
        additional values: {vested_balance, public_key_string}
    */
    importBalance( account_name_or_id, balances, broadcast) {
        return (dispatch) => {

            return new Promise((resolve, reject) => {

                let db = Apis.instance().db_api();
                let address_publickey_map = {};

                let account_lookup = FetchChain("getAccount", account_name_or_id);
                let unlock = WalletUnlockActions.unlock();

                let p = Promise.all([ unlock, account_lookup ]).then( (results)=> {
                    let account = results[1];
                    //DEBUG console.log('... account',account)
                    if(account == void 0)
                        return Promise.reject("Unknown account " + account_name_or_id);

                    let balance_claims = [];
                    let signer_pubkeys = {};
                    for(let balance of balances) {
                        let {vested_balance, public_key_string} = balance;

                        //DEBUG console.log('... balance',b)
                        let total_claimed;
                        if( vested_balance ) {
                            if(vested_balance.amount == 0)
                                // recently claimed
                                continue;

                            total_claimed = vested_balance.amount;
                        } else
                            total_claimed = balance.balance.amount;

                        //assert
                        if(vested_balance && vested_balance.asset_id != balance.balance.asset_id)
                            throw new Error("Vested balance record and balance record asset_id missmatch",
                                vested_balance.asset_id,
                                balance.balance.asset_id
                            );

                        signer_pubkeys[public_key_string] = true;
                        balance_claims.push({
                            fee: { amount: "0", asset_id: "1.3.0"},
                            deposit_to_account: account.get("id"),
                            balance_to_claim: balance.id,
                            balance_owner_key: public_key_string,
                            total_claimed: {
                                amount: total_claimed,
                                asset_id: balance.balance.asset_id
                            }
                        });
                    }
                   //  if( ! balance_claims.length) {
                   //      throw new Error("No balances to claim");
                   //  }

                    //DEBUG console.log('... balance_claims',balance_claims)
                    let tr = new TransactionBuilder();

                    for(let balance_claim of balance_claims) {
                        tr.add_type_operation("balance_claim", balance_claim);
                    }
                    // With a lot of balance claims the signing can take so Long
                    // the transaction will expire.  This will increase the timeout...
                    tr.set_expire_seconds( (15 * 60) + balance_claims.length);
                    return WalletDb.process_transaction(tr, Object.keys(signer_pubkeys), broadcast )
                    .then(result => {
                        dispatch(true);
                        return result;
                    });
                });
                resolve(p);
            });
        };
    }
}

export default alt.createActions(WalletActions)
