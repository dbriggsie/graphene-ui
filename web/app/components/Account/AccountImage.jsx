import React from "react";
import Identicon from "./Identicon";

const AccountImage = ({account, image, size = {height: 120, width: 120}}) => {

    const custom_image = image ?
        <img src={image} height={size.height + "px"} width={size.width + "px"}/> :
        <Identicon id={account} account={account} size={size}/>;

    return (
        <div className="account-image">
            {custom_image}
        </div>
    );
};

export default AccountImage;
