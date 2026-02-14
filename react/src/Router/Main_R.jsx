import React from 'react';
import { createBrowserRouter } from "react-router";
import AppLayout from "../AppLayout/AppLayout.jsx";
import TimeDiffrence from "../Pages/TimeDiffrence.jsx";
import FileContainer from "../featuers/FileContainer/FileContainer.jsx";

const Router = createBrowserRouter([{
    element: <AppLayout />,
    children: [
        { path: '/', element: <TimeDiffrence /> },
        { path: '/dev', element: <FileContainer/>},
    ]
}])

export default Router;