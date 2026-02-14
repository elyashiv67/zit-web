import React from 'react';
import { NavLink } from "react-router";
import './Nav.css';

function Nav() {
    return (
        <>
            <div className="nav-list">
                <NavLink
                    to={"/"}
                    className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                >
                    Time Diffrence
                </NavLink>
                <NavLink
                    to={"/dev"}
                    className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                >
                    dev
                </NavLink>

            </div>
        </>
    );
}

export default Nav;