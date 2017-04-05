import React from "react";
import utils from "common/utils";

const PriceText = ({price, preFormattedPrice, quote, base}) => {
    const formattedPrice = preFormattedPrice ? preFormattedPrice : utils.price_to_text(price, quote, base);

    console.log('1@>price',price, quote, base)
    console.log('2@>preFormattedPrice',preFormattedPrice)
    console.log('3@>formattedPrice',formattedPrice)
    formattedPrice.int=parseInt(formattedPrice.int)||0;
    formattedPrice.dec=parseInt(formattedPrice.dec)||0;
    formattedPrice.trailing=parseInt(formattedPrice.trailing)||0;
//formattedPrice.full*10
//"000000"
    if(!formattedPrice.int&&!formattedPrice.dec){
        formattedPrice.dec="000000";
        formattedPrice.trailing = (" "+formattedPrice.full*10).split(/[0]{3,}/)[1].slice(-2);
    }

    if (formattedPrice.full >= 1) {
        return (
            <span>
                <span className="price-integer">{formattedPrice.int}.</span>
                {formattedPrice.dec ? <span className="price-integer">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-decimal">{formattedPrice.trailing}</span> : null}
            </span>
        );
    } else if (formattedPrice.full >= 0.1) {
        return (
            <span>
                <span className="price-decimal">{formattedPrice.int}.</span>
                {formattedPrice.dec ? <span className="price-integer">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-decimal">{formattedPrice.trailing}</span> : null}
            </span>
        );
    } else {
        return (
            <span>
                <span className="price-decimal">{formattedPrice.int}.</span>
                {formattedPrice.dec ? <span className="price-decimal">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-integer">{formattedPrice.trailing}</span> : null}
            </span>
        );
    }
};

export default PriceText;
