import React from 'react';
import {createBrowserRouter} from "react-router";
import AppLayout from "../../AppLayout/AppLayout.jsx";
import TimeContainer from "../TimeContainer/TimeContainer.jsx";
import DateContainer from "../DateContainer/DateContainer.jsx";


const Router = createBrowserRouter([{
    element: <AppLayout/>,
    children: [
        {path:'/' , element:<TimeContainer/>},
        {path:'/Date', element:<DateContainer/>}
    ]
}])

export default Router;