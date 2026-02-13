import React from 'react';
import {NavLink} from "react-router";

function Nav() {
    return (
        <>
            <div style={{display:'flex',gap:'10px'}}>
                <NavLink to={"/aboutMe"}>about me</NavLink>
                <NavLink to={"/images"}>images</NavLink>
                <NavLink to={"/links"}>links</NavLink>
            </div>
        </>
    );
}

export default Nav;