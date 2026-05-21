import request from './index'

export const getCategoryTree = () => request.post('/category/tree')
export const createCategory = (data) => request.post('/category/create', data)
export const updateCategory = (data) => request.post('/category/update', data)
export const deleteCategory = (id) => request.post(`/category/delete/${id}`)
