// look for more icons here https://linearicons.com/free or here http://hawcons.com/preview/

import React from "react";

let icons = ["user", "trash", "chevron-down", "menu", "database", "search",
    "plus-circle", "lnr-cross", "question-circle", "cross-circle", "cog", "layers", "users", "wand", "b-logo",
    "accounts", "witnesses", "assets", "proposals", "blocks", "committee_members", "workers", "key",
    "checkmark-circle", "checkmark", "piggy", "locked", "unlocked" , "markets", "fi-star" ,"fees",
    "thumb-tack", "clock"];

let icons_map = {};
for (let i of icons) icons_map[i] = require(`./${i}.svg`);

require("./icon.scss");

const Icon = ({name = "", size, className = ""}) => {
    let classes = "icon " + name;

    if(size) classes += " icon-" + size;
    if(className) classes += " " + className;

    return <span className={classes} dangerouslySetInnerHTML={{__html: icons_map[name]}}/>;
};

export default Icon;
