import React from "react";
import utils from "common/utils";

const PriceText = ({price, preFormattedPrice, quote, base}) => {
    const formattedPrice = preFormattedPrice ? preFormattedPrice : utils.price_to_text(price, quote, base);

    console.log('1@>price',price)
    console.log('2@>preFormattedPrice',preFormattedPrice)
    console.log('3@>formattedPrice',formattedPrice)

    if (formattedPrice.full >= 1) {
        return (
            <span>
                <span className="price-integer">{parseInt(formattedPrice.int)||"> "+0.000001}.</span>
                {formattedPrice.dec ? <span className="price-integer">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-decimal">{formattedPrice.trailing}</span> : null}
            </span>
        );
    } else if (formattedPrice.full >= 0.1) {
        return (
            <span>
                <span className="price-decimal">{parseInt(formattedPrice.int)||"> "+0.000001}.</span>
                {formattedPrice.dec ? <span className="price-integer">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-decimal">{formattedPrice.trailing}</span> : null}
            </span>
        );
    } else {
        return (
            <span>
                <span className="price-decimal">{parseInt(formattedPrice.int)||"> "+0.000001}.</span>
                {formattedPrice.dec ? <span className="price-decimal">{formattedPrice.dec}</span> : null}
                {formattedPrice.trailing ? <span className="price-integer">{formattedPrice.trailing}</span> : null}
            </span>
        );
    }
};

export default PriceText;
