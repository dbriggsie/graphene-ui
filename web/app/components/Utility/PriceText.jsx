import React from "react";
import utils from "common/utils";

const PriceText = ({price, preFormattedPrice, quote, base}) => {
    const formattedPrice = preFormattedPrice ? preFormattedPrice : utils.price_to_text(price, quote, base);

    formattedPrice.int=parseInt(formattedPrice.int)||0;
    formattedPrice.dec=parseInt(formattedPrice.dec)||0;
    formattedPrice.trailing=parseInt(formattedPrice.trailing)||0;

    if(!formattedPrice.int&&!formattedPrice.dec){
        if(isFinite(formattedPrice.full)){
            formattedPrice.dec="000000";
            formattedPrice.trailing = (formattedPrice.full*100000+"").split(".").join("").match(/[1-9][0-9]?/g)[0];
        }
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
