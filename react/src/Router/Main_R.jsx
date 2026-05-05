import React from 'react';
import { createBrowserRouter } from "react-router";
import AppLayout from "../AppLayout/AppLayout.jsx";
import TimeDiffrence from "../Pages/TimeDiffrence.jsx";
import { HistoryProvider } from "../Context/history/HistoryContext.jsx";

const Router = createBrowserRouter([{
    element: <AppLayout />,
    children: [
        {
            path: '/', element:
                <HistoryProvider>
                    <TimeDiffrence />
                </HistoryProvider>
        }
    ]
}], { basename: '/zit-web/' })

export default Router;