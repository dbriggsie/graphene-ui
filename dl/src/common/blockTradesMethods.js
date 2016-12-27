function fetchCoins(url = "https://blocktrades.us/ol/api/v2/coins") {
    return fetch(url).then(reply => reply.json().then(result => {
        return result;
    })).catch(err => {
        console.log("error fetching blocktrades list of coins", err, url);
    });
}

function requestDepositAddress({inputCoinType, outputCoinType, outputAddress, url, stateCallback}) {
    let body = {
        inputCoinType,
        outputCoinType,
        outputAddress
    };

    let body_string = JSON.stringify(body);

    fetch( url + "/simple-api/initiate-trade", {
        method:"post",
        headers: new Headers( { "Accept": "application/json", "Content-Type":"application/json" } ),
        body: body_string
    }).then( reply => { reply.json()
        .then( json => {
            // console.log( "reply: ", json )
            let address = {"address": json.inputAddress || "unknown", "memo": json.inputMemo};
            if (stateCallback) stateCallback(address);
        }, error => {
            // console.log( "error: ",error  );
            if (stateCallback) stateCallback({"address": "unknown", "memo": null});
        });
    }, error => {
        // console.log( "error: ",error  );
        if (stateCallback) stateCallback({"address": "unknown", "memo": null});
    });
}

function getBackedCoins({allCoins, backer}) {
    let coins_by_type = {};
    allCoins.forEach(coin_type => coins_by_type[coin_type.coinType] = coin_type);
    console.log("coins_by_type", coins_by_type);
    let blocktradesBackedCoins = [];
    allCoins.forEach(coin_type => {
        if (coin_type.walletSymbol.startsWith(backer + ".") && coin_type.backingCoinType)
        {
            blocktradesBackedCoins.push({
                name: coins_by_type[coin_type.backingCoinType].name,
                walletType: coins_by_type[coin_type.backingCoinType].walletType,
                backingCoinType: coins_by_type[coin_type.backingCoinType].walletSymbol,
                symbol: coin_type.walletSymbol,
                supportsMemos: coins_by_type[coin_type.backingCoinType].supportsOutputMemos
            });
        }});
    return blocktradesBackedCoins;
}

export default {
    fetchCoins,
    getBackedCoins,
    requestDepositAddress
};
