import api from '../utils/api';
import axios from "axios";

export const fetchUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await axios.patch(`/api/users/${userId}/`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`, // if you use JWT
    },
  });
  return response.data;
};