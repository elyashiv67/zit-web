import React from 'react';
import {createBrowserRouter} from "react-router";
import AppLayout from "../../AppLayout/AppLayout.jsx";
import TimeContainer from "../TimeContainer/TimeContainer.jsx";


const Router = createBrowserRouter([{
    element: <AppLayout/>,
    children: [
        {path:'/' , element:<TimeContainer/>},
    ]
}])

export default Router;