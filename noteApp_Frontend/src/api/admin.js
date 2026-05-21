import request from './index'

export const getAdminUsers = (params) => request.get('/admin/users', { params })
export const disableUser = (id) => request.put(`/admin/users/${id}/disable`)
export const enableUser = (id) => request.put(`/admin/users/${id}/enable`)

export const getAdminNotes = (params) => request.get('/admin/notes', { params })
export const adminDeleteNote = (id) => request.delete(`/admin/notes/${id}`)

export const getAdminTags = (params) => request.get('/admin/tags', { params })
export const adminDeleteTag = (id) => request.delete(`/admin/tags/${id}`)

export const getAdminCategories = (params) => request.get('/admin/categories', { params })
export const adminDeleteCategory = (id) => request.delete(`/admin/categories/${id}`)
