import React from 'react';
import { createBrowserRouter } from "react-router";
import AppLayout from "../AppLayout/AppLayout.jsx";
import TimeDiffrence from "../Pages/TimeDiffrence.jsx";
import FileUploader from "../featuers/FileUploader/FileUploader.jsx";

const Router = createBrowserRouter([{
    element: <AppLayout />,
    children: [
        { path: '/', element: <TimeDiffrence /> },
        { path: '/dev', element: <FileUploader/>},
    ]
}])

export default Router;