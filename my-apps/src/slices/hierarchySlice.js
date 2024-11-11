// src/slices/hierarchySlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    parentName: '',
    childName: '',
    savedData: [],
    editData: null,
    selectedParent: null,
};

const hierarchySlice = createSlice({
    name: 'hierarchy',
    initialState,
    reducers: {
        setParentName: (state, action) => {
            state.parentName = action.payload;
        },
        setChildName: (state, action) => {
            state.childName = action.payload;
        },
        setSavedData: (state, action) => {
            state.savedData = action.payload;
        },
        setEditData: (state, action) => {
            state.editData = action.payload;
        },
        setSelectedParent: (state, action) => {
            state.selectedParent = action.payload;
        },
        clearForm: (state) => {
            state.parentName = '';
            state.childName = '';
            state.selectedParent = null;
            state.editData = null;
        },
    },
});

export const {
    setParentName,
    setChildName,
    setSavedData,
    setEditData,
    setSelectedParent,
    clearForm,
} = hierarchySlice.actions;

export default hierarchySlice.reducer;
