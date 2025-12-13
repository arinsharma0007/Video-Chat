import React, { createContext, useState } from "react";
import axios from "axios";
import httpStatus from "http-status";
import server from "../environment";

export const AuthContext = createContext({});



const client = axios.create({
  baseURL: `${server}/api/v1/users`,
});

// ...existing code...
export const AuthProvider = ({ children }) => {
  // don't call useContext(AuthContext) here
  const [userData, setUserData] = useState(null);

  const handleRegister = async (name, username, password) => {
    try {
      let request = await client.post("/register", {
        name,
        username,
        password,
      });

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (error) {
      throw error;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      let request = await client.post("/login", {
        username,
        password,
      });

      // check `status`, not `httpStatus`
      if (request.status === httpStatus.OK && request.data?.token) {
        localStorage.setItem("token", request.data.token);
        setUserData(request.data.user);
        return { success: true };
      }
    } catch (error) {
      throw error;
    }
  };

   const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data
        } catch
         (err) {
            throw err;
        }
    }

  const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }


    const data = {
        userData, setUserData, addToUserHistory, getHistoryOfUser, handleRegister, handleLogin
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
};
// ...existing code...