import {LimitOrder, realToRatio, Price, Asset, limitByPrecision, precisionToRatio} from "../src/common/orderClasses";
import assert from "assert";

console.log("**** Starting market tests here ****");

describe("Utility functions", function() {

    describe("limitByPrecision", function() {
        it("Limits to precision without rounding", function() {
            assert.equal(limitByPrecision(1.23236, 4), 1.2323, "Value should be equal to 1.2323");
        });

        it("Does not add extra digits", function() {
            let num = limitByPrecision(1.23236, 8);
            assert.equal(num, 1.23236, "Value should be equal to 1.23236");
            assert.equal(num.toString().length, 7, "Length should be equal to 7");
        });
    });

    describe("precisionToRatio", function() {
        it("Returns the multiplier for an integer precision", function() {
            assert.equal(precisionToRatio(2), 100, "Value should equal 100");
            assert.equal(precisionToRatio(5), 100000, "Value should equal 100000");
            assert.equal(precisionToRatio(8), 100000000, "Value should equal 100000000");
        });
    });
});

describe("Asset", function() {

    it("Instantiates empty", function() {
        let asset = new Asset();
        assert.equal(asset.asset_id, "1.3.0", "Default asset should be 1.3.0");
        assert.equal(asset.amount, 0, "Default amount should be 0");
        assert.equal(asset.satoshi, 100000, "Satoshi should be 100000");
    });

    it("Instantiates with values", function() {
        let asset = new Asset({asset_id: "1.3.121", amount: 242, precision: 4});
        assert.equal(asset.asset_id, "1.3.121", "Asset should be 1.3.121");
        assert.equal(asset.amount, 242, "Amount should be 242");
        assert.equal(asset.satoshi, 10000, "Satoshi should be 10000");
    });

    it("Instantiates from real number", function() {
        let asset = new Asset({asset_id: "1.3.0", real: 1});
        assert.equal(asset.asset_id, "1.3.0", "Asset should be 1.3.0");
        assert.equal(asset.amount, 100000, "Amount should be 242");
        assert.equal(asset.satoshi, 100000, "Satoshi should be 10000");
    });

    it("Can be added", function() {
        let asset = new Asset({asset_id: "1.3.121", amount: 242});
        let asset2 = new Asset({asset_id: "1.3.121", amount: 242});
        asset.plus(asset2);
        assert.equal(asset.asset_id, "1.3.121", "Asset should be 1.3.121");
        assert.equal(asset.amount, 484, "Amount should be 484");
    });

    it("Can be subtracted", function() {
        let asset = new Asset({asset_id: "1.3.121", amount: 242});
        let asset2 = new Asset({asset_id: "1.3.121", amount: 242});
        asset.minus(asset2);
        assert.equal(asset.asset_id, "1.3.121", "Asset should be 1.3.121");
        assert.equal(asset.amount, 0, "Amount should be 0");
    });

    it("Throws when adding or subtracting unequal assets", function() {
        let asset = new Asset({asset_id: "1.3.121", amount: 242});
        let asset2 = new Asset({asset_id: "1.3.0", amount: 242});
        assert.throws(function() {
            asset.plus(asset2);
        }, Error);

        assert.throws(function() {
            asset.minus(asset2);
        }, Error);
    });

    it("Can be updated with real or satoshi amounts", function() {
        let asset = new Asset();
        asset.setAmount({real: 1.2323});
        assert.equal(asset.getAmount({}), 123230, "Amount should equal 123230");
        assert.equal(asset.getAmount({real: true}), 1.2323, "Amount should equal 1.2323");

        asset.setAmount({sats: 232223});
        assert.equal(asset.getAmount(), 232223, "Amount should equal 232223");
        assert.equal(asset.getAmount({real: true}), 2.32223, "Amount should equal 2.32223");

        asset.setAmount({real: 2.3212332223});
        // assert.equal(asset.getAmount(), 232223, "Amount should equal 232223");
        assert.equal(asset.getAmount({real: true}), 2.32123, "Amount should equal 2.32123");
    });

    it("Returns true if amount > 0", function() {
        let asset = new Asset({amount: 232});
        assert.equal(asset.hasAmount(), true, "Price should be valid");
    });

    it("Returns false if amount is 0", function() {
        let asset = new Asset();
        assert.equal(asset.hasAmount(), false, "Price should not be valid");
    });

    it("Throws when setAmount args are not set or incorrect", function() {
        let asset = new Asset();

        assert.throws(function() {
            asset.setAmount();
        }, Error);

        assert.throws(function() {
            asset.setAmount({real: "2.2323"});
        }, Error);

        assert.throws(function() {
            asset.setAmount({sats: "2.2323"});
        }, Error);
    });

    it("Can be multiplied with a price", function() {
        let asset = new Asset({asset_id: "1.3.0", real: 100});
        let price1 = new Price({
            base: new Asset({asset_id: "1.3.0"}),
            quote: new Asset({asset_id: "1.3.121", precision: 4}),
            real: 200
        });

        let price2 = new Price({
            base: new Asset({asset_id: "1.3.121", precision: 4}),
            quote: new Asset({asset_id: "1.3.0"}),
            real: 0.001
        });

        let result1 = asset.times(price1);
        assert.equal(result1.asset_id, "1.3.121", "Asset id should be 1.3.121");
        // 100 BTS * 200 BTS/USD = 100 BTS * (1/200) USD/BTS = 0.5 USD
        assert.equal(result1.getAmount({real: true}), 0.5, "Asset amount should be 0.5");

        let result2 = asset.times(price2);
        assert.equal(result2.asset_id, "1.3.121", "Asset id should be 1.3.121");
        // 100 BTS * 0.001 USD /BTS = 0.1 USD
        assert.equal(result2.getAmount({real: true}), 0.1, "Asset amount should be 0.1");
    });

    it("Throws when multiplied with an incorrect price", function() {
        let asset = new Asset({asset_id: "1.3.0", amount: 100});
        let price = new Price({
            base: new Asset({asset_id: "1.3.12", amount: 25}),
            quote: new Asset({asset_id: "1.3.121", amount: 500})
        });

        assert.throws(function() {
            asset.times(price);
        }, Error);
    });

    it("Can be converted to object", function() {
        let asset = new Asset({amount: 2323});
        let obj = asset.toObject();
        assert.equal(Object.keys(obj).length, 2, "Object should have 2 keys");
        assert.equal("asset_id" in obj, true, "Object should have asset_id key");
        assert.equal("amount" in obj, true, "Object should have amount key");
    });
});

describe("Price", function() {

    let base = new Asset({asset_id: "1.3.0", amount: 50});
    let quote = new Asset({asset_id: "1.3.121", amount: 250, precision: 4});

    it("Instantiates", function() {
        let price = new Price({base, quote});

        assert.equal(price.base.asset_id, "1.3.0", "Base asset should be 1.3.0");
        assert.equal(price.base.amount, 50, "Base amount should be 50");
        assert.equal(price.quote.asset_id, "1.3.121", "Quote asset should be 1.3.121");
        assert.equal(price.quote.amount, 250, "Quote amount should be 250");
        assert.equal(price.toReal(), 0.02, "Real price should be 0.02");
    });

    it("Returns true if valid", function() {
        let price = new Price({base, quote});
        assert.equal(price.isValid(), true, "Price should be valid");
    });

    it("Returns false if not valid", function() {
        let price = new Price({base: new Asset({amount: 0}), quote});
        assert.equal(price.isValid(), false, "Price should not be valid");
    });

    it("Instantiates from real number", function() {
        let priceNum = 250;
        let price = new Price({
            base: new Asset({asset_id: "1.3.0"}),
            quote: new Asset({asset_id: "1.3.121", precision: 4}),
            real: priceNum
        });

        assert.equal(price.toReal(), priceNum, "Real price should equal " + priceNum);
        assert.equal(price.base.amount, 2500, "Base amount should equal 2500");
        assert.equal(price.quote.amount, 1, "Quote amount should equal 1");

        let price2 = new Price({
            base: new Asset({asset_id: "1.3.0"}),
            quote: new Asset({asset_id: "1.3.121", precision: 4}),
            real: 212.23323
        });

        assert.equal(price2.toReal().toFixed(5), "212.23323", "Real price should equal 212.23323");
        assert.equal(price2.base.amount, 212233230, "Base amount should equal 212233230");
        assert.equal(price2.quote.amount, 100000, "Quote amount should equal 100000");

        priceNum = 121000.52323231;
        let price3 = new Price({
            base: new Asset({asset_id: "1.3.0"}),
            quote: new Asset({asset_id: "1.3.103", precision: 8}),
            real: priceNum
        });

        assert.equal(price3.toReal(), priceNum.toFixed(5), "Real price should equal " + priceNum.toFixed(5));

        priceNum = 0.00000321;
        for (var i = 0; i < 100000; i+=100) {
            priceNum += i;
            if (priceNum > 10000) {
                priceNum = limitByPrecision(priceNum, 5);
            }
            priceNum = parseFloat(priceNum.toFixed(8));
            price3 = new Price({
                base: new Asset({asset_id: "1.3.103", precision: 8}),
                quote: new Asset({asset_id: "1.3.121", precision: 4}),
                real: priceNum
            });
            assert.equal(price3.toReal(), priceNum, "Real price should equal " + priceNum);
        }
    });

    it("Can be output as a real number", function() {
        let price = new Price({base, quote});
        let real = price.toReal();
        assert.equal(real, 0.02, "Real price should be 0.02");
    });

    it("Throws if inputs are invalid", function() {
        assert.throws(function() {
            let price = new Price({base: null, quote});
        });
        assert.throws(function() {
            let price = new Price({base, quote: null});
        });
        assert.throws(function() {
            let price = new Price({base: null, quote: null});
        });
    });

    it("Throws if base and quote assets are the same", function() {
        assert.throws(function() {
            let price = new Price({base, quote: base});
        });
    });
});

describe("Limit order", function() {
    let USD = new Asset({
        precision: 4,
        asset_id: "1.3.121",
        real: 5.232
    });

    let BTS = new Asset({
        real: 1045.5
    });

    it("Instantiates", function() {
        let order =  new LimitOrder({
            to_receive: USD,
            for_sale: BTS
        });
    });

    it("Can be converted to object", function() {
        let order =  new LimitOrder({
            to_receive: USD,
            for_sale: BTS
        });
        let obj = order.toObject();
        assert.equal(Object.keys(obj).length, 5, "Object should have 5 keys");
        assert.equal("min_to_receive" in obj, true, "Object should have min_to_receive key");
        assert.equal("amount_to_sell" in obj, true, "Object should have amount_to_sell key");
        assert.equal("expiration" in obj, true, "Object should have expiration key");
        assert.equal("fill_or_kill" in obj, true, "Object should have fill_or_kill key");
        assert.equal("seller" in obj, true, "Object should have seller key");
    });

    it("Throws if inputs are invalid", function() {
        assert.throws(function() {
            let order =  new LimitOrder({
                to_receive: null,
                for_sale: BTS
            });
        });

        assert.throws(function() {
            let order =  new LimitOrder({
                to_receive: USD,
                for_sale: null
            });
        });

        assert.throws(function() {
            let order =  new LimitOrder({
                to_receive: null,
                for_sale: null
            });
        });
    });

    it("Throws if assets are the same", function() {
        assert.throws(function() {
            let order =  new LimitOrder({
                to_receive: BTS,
                for_sale: BTS
            });
        });
    });

});

// 93 BitUSD at 192.66528
