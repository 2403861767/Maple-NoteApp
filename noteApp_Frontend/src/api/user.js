import request from './index'

export const login = (data) => request.post('/user/login', data)
export const register = (data) => request.post('/user/register', data)
export const getCurrentUser = () => request.get('/user/current')
export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/user/avatar', formData)
}
export const updateProfile = (data) => request.put('/user/profile', data)
