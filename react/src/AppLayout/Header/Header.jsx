import React from 'react';
import { NavLink } from "react-router-dom";
import './Header.css';

function Header() {
    return (
        <header className="header">
            <div className="header-logo">Portfolio</div>
            <nav>
                <ul className="nav-list">
                    <li><NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink></li>
                    <li><NavLink to="/aboutMe" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>About Me</NavLink></li>
                    <li><NavLink to="/images" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Images</NavLink></li>
                    <li><NavLink to="/links" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Links</NavLink></li>
                </ul>
            </nav>
        </header>
    );
}

export default Header;