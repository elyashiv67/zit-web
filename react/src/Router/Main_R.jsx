import React from 'react';
import { createBrowserRouter } from "react-router";
import AppLayout from "../AppLayout/AppLayout.jsx";
import TimeContainer from "../featuers/TimeContainer/TimeContainer.jsx";
import DateContainer from "../featuers/DateContainer/DateContainer.jsx";
import TimeDiffrence from "../Pages/TimeDiffrence.jsx";

const Router = createBrowserRouter([{
    element: <AppLayout />,
    children: [
        { path: '/', element: <TimeDiffrence /> }
    ]
}])

export default Router;