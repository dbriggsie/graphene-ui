const GET_DEPOSIT_VERIFY_URL = `${SERVER_ADMIN_URL}/api/v1/user/verify`;
const GET_DEPOSIT_URL = `${SERVER_ADMIN_URL}/api/v1/deposit/get_data`;
const ADD_DEPOSIT_URL = `${SERVER_ADMIN_URL}/api/v1/deposit/add`;
const ACTIVE_FIATS_URL = `${SERVER_ADMIN_URL}/api/v1/token/active`;
const HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

class FiatApi {

    static isVerifyAccountUsd(accountName, accountId){
        return new Promise((resolve, reject) => {
            fetch(GET_DEPOSIT_VERIFY_URL, {
                method: "POST",
                headers: HEADERS,
                body: JSON.stringify({
                    account_ol: accountName,
                    account_id: accountId
                })
            }).then(
                response => {
                    if (response.status !== 200) {
                        reject("Request failed");
                    }
                    response.json().then((data) => {
                       if (data.success !== "true") {
                            if (data.error == 607) {
                                resolve({
                                    verified: data.success
                                });
                            } else {
                                reject("Request failed");
                            }
                        }
                        resolve({
                            success: data.success
                        })
                    });
                }).catch((error) => {
                reject(error);
            });
        });
    };

    static getDepositData({ currencyName, accountName, accountId }, onError) {
        return new Promise((resolve, reject) => {
            fetch(GET_DEPOSIT_URL, {
                method: "POST",
                headers: HEADERS,
                body: JSON.stringify({
                    currency_name_id: currencyName,
                    account_ol: accountName,
                    account_id: accountId
                })
            }).then(
                response => {
                    if (response.status !== 200) {
                        reject("Request failed");
                    }
                    response.json().then((data) => {
                        if (data.success !== "true") {
                            if (data.error == 606) {
                                resolve({
                                    unlockTime: data.unlock_time
                                });
                            } else {
                                reject("Request failed");
                            }
                        }
                        const service = data.list_service && data.list_service[0];
                        resolve({
                            fees: data.fees,
                            token: data.token,
                            paymentService: service,
                            unlockTime: data.unlock_time,
                            qrUrl: service && service.link_qr_code,
                            captchaUrl: data.images_link_captcha
                        })
                    });
                }).catch((error) => {
                    reject(error);
                });
        });
    }

    static addDeposit({ currencyName,
        accountName,
        accountId,
        serviceId,
        captcha,
        token,
        depositAmount,
        fee,
        fees,
        tokenAmount,
        userServiceId }) {
        return new Promise((resolve, reject) => {
            fetch(ADD_DEPOSIT_URL, {
                method: "POST",
                headers: HEADERS,
                body: JSON.stringify({
                    captcha: captcha,
                    token: token,
                    dep_amount: depositAmount,
                    dep_fee: fee,
                    dep_receive_amount_from_user: tokenAmount,
                    account_ol: accountName,
                    account_id: accountId,
                    currency_name_id: currencyName,
                    services_id: serviceId,
                    user_service_id: userServiceId,
                    fees: {
                        "fee_share_dep": fees && fees.fee_share_dep,
                        "fee_min_val_dep": fees && fees.fee_min_val_dep
                    }
                })
            }).then((response) => {
                if (response.status === 200) {
                    response.json().then((data) => {
                        if (data.success !== "true") {
                            if (data.error === "605") {
                                resolve({ wrongCaptchaError: true });
                            } else {
                                reject(data.error);
                            }
                        } else {
                            resolve({ depositDone: true, ...data });
                        }
                    });
                } else {
                    reject(response.status);
                }
            }).catch((error) => {
                reject(error);
            })
        });
    }

    static getActive({ accountName, accountId }) {
        return new Promise((resolve, reject) => {
            fetch(ACTIVE_FIATS_URL, {
                method: "POST",
                headers: HEADERS,
                body: JSON.stringify({
                    account_ol: accountName,
                    account_id: accountId
                })
            }).then(
                response => {
                    if (response.status !== 200) {
                        reject("Request failed");
                    }
                    response.json().then((data) => {
                        if (data.success !== "true") {
                            reject("Request failed");
                        }
                        resolve({availableFiatServices: data.list_transfer_service});
                    });
                }).catch(() => {
                    reject("Request failed")
                });
        });
    }
}

export default FiatApi;
