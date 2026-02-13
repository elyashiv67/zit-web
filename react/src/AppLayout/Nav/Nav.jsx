import React from 'react';
import {NavLink} from "react-router";

function Nav() {
    return (
        <>
            <div style={{display:'flex',gap:'10px'}}>
                <NavLink to={"/"}>Time Diff</NavLink>
                <NavLink to={"/Date"}>Date Diff</NavLink>
            </div>
        </>
    );
}

export default Nav;