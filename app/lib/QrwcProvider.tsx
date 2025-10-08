"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Qrwc } from "@q-sys/qrwc";

interface QrwcContextType {
  qrwcInstance: Qrwc | null;
  isConnected: boolean;
}

const QrwcContext = createContext<QrwcContextType | null>(null);

export const QrwcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [qrwcInstance, setQrwcInstance] = useState<Qrwc | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const coreIp = process.env.NEXT_PUBLIC_CORE_IP
    
    useEffect(() => {
        let activeQrwc: Qrwc | null = null;
        let socket: WebSocket;

        const initialiseQrwc = async () => {
            try {
                socket = new WebSocket(`ws://${coreIp}/qrc-public-api/v0`);

                const qrwcInstance = await Qrwc.createQrwc({
                    socket,
                    pollingInterval: 100,
                })

                activeQrwc = qrwcInstance;
                setQrwcInstance(qrwcInstance);

                if (socket.readyState === WebSocket.OPEN) {
                    console.log("Connected to Q-SYS Core");
                    setIsConnected(true);
                }

                qrwcInstance.on("disconnected", () => {
                    console.log("Disconnected from Q-SYS Core");
                    setIsConnected(false);
                    setTimeout(initialiseQrwc, 5000); // Attempt to reconnect after 5 seconds
                });
                qrwcInstance.on("error", (err) => {
                    console.error("QRWC Error:", err);
                    qrwcInstance.close();
                    setIsConnected(false);
                    setTimeout(initialiseQrwc, 5000)
                });

            } catch (error) {
                console.error("Error initializing QRWC:", error);
            }
        };

        initialiseQrwc();
        return () => {
            qrwcInstance?.close();
        };
    }, [coreIp]);

    return(
        <QrwcContext.Provider value={{ qrwcInstance, isConnected }}>
            {children}
        </QrwcContext.Provider>
    );
};

export const useQrwc = () => {
    const context = useContext(QrwcContext);
    if (!context) {
        throw new Error("useQrwc must be used within a QrwcProvider");
    }
    return context;
};