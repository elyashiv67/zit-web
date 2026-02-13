import React from 'react';
import './Header.css';
import Nav from "../Nav/Nav.jsx";
import Logo from "../../assets/logo-2/default.svg?react";

function Header() {
    return (
        <header className="header">
            <div className="header-logo">ZitWeb</div>
            <Logo/>
            <Nav/>
        </header>
    );
}

export default Header;