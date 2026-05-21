import request from './index'

export const getTagList = () => request.get('/tag/list')
export const createTag = (data) => request.post('/tag/create', data)
export const updateTag = (data) => request.post('/tag/update', data)
export const deleteTag = (id) => request.post(`/tag/delete/${id}`)
