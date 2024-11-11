import React, { useEffect, useCallback, useState } from 'react';
import { MantineProvider, Button, TextInput, Accordion } from '@mantine/core';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import {
  setParentName,
  setChildName,
  setSavedData,
  setEditData,
  setSelectedParent,
  clearForm,
} from './slices/hierarchySlice';

const App = () => {
  const {
    parentName,
    childName,
    savedData,
    editData,
    selectedParent,
  } = useSelector((state) => state.hierarchy);
  const dispatch = useDispatch();

  const [errors, setErrors] = useState({
    parentName: '',
    childName: '',
  });

  const firebaseUrl =
    'https://firestore.googleapis.com/v1/projects/my-apps-60a89/databases/(default)/documents/hierarchies';

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(firebaseUrl);
      const rawData = response.data.documents || [];
      const hierarchicalData = organizeHierarchy(rawData);
      dispatch(setSavedData(hierarchicalData));
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    }
  }, [dispatch]);

  const organizeHierarchy = (data) => {
    const map = {};
    const roots = [];

    data.forEach((entry) => {
      const nameField = entry.fields?.name?.stringValue;
      if (!nameField) return;
      map[nameField] = {
        name: nameField,
        fields: entry.fields,
        children: [],
        breadcrumb: entry.fields?.breadcrumb?.stringValue || nameField,
      };
    });

    data.forEach((entry) => {
      const parentName = entry.fields?.parentName?.stringValue;
      const currentName = entry.fields?.name?.stringValue;

      if (parentName && map[parentName]) {
        map[parentName].children.push(map[currentName]);
      } else if (!parentName && currentName) {
        roots.push(map[currentName]);
      }
    });

    return roots;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createBreadcrumb = (entry, path = '') => {
    if (!entry || !entry.fields) return entry;
    const name = entry.fields.name?.stringValue || '';
    const newPath = path ? `${path} -> ${name}` : name;

    const updatedEntry = { ...entry, breadcrumb: newPath };

    if (updatedEntry.children && updatedEntry.children.length > 0) {
      updatedEntry.children = updatedEntry.children.map((child) =>
        createBreadcrumb(child, newPath)
      );
    }

    return updatedEntry;
  };

  const renderHierarchy = (data) => {
    return data.map((entry) => {
      const updatedEntry = createBreadcrumb(entry);

      return (
        <Accordion.Item key={updatedEntry.name} value={updatedEntry.name}>
          <Accordion.Control>
            {updatedEntry.breadcrumb}
            <span
              onClick={() => handleAddChild(updatedEntry)}
              className="no-underline ml-2.5 cursor-pointer text-xl text-blue-500"
            >
              <b>+</b>
            </span>
            <span
              onClick={() => handleEdit(updatedEntry)}
              className="ml-2.5 cursor-pointer text-orange-500"
            >
              <b>✏️</b>
            </span>
            <span
              onClick={() => handleDelete(updatedEntry)} // Pass the entry to handleDelete
              className="ml-2.5 cursor-pointer text-red-500"
            >
              <b>❌</b>
            </span>
          </Accordion.Control>

          {updatedEntry.children && updatedEntry.children.length > 0 && (
            <Accordion.Panel>
              <Accordion multiple>
                {renderHierarchy(updatedEntry.children)}
              </Accordion>
            </Accordion.Panel>
          )}
        </Accordion.Item>
      );
    });
  };

  const handleAddChild = (parent) => {
    dispatch(setParentName(parent.fields?.name?.stringValue || ''));
    dispatch(setSelectedParent({ ...parent, children: parent.children || [] }));
    dispatch(setEditData(null));
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = { parentName: '', childName: '' };


    if (!childName) {
      newErrors.childName = 'Child Name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let response;
      let breadcrumbPath = parentName ? `${parentName} -> ${childName}` : childName;

      if (selectedParent) {
        response = await axios.post(firebaseUrl, {
          fields: {
            name: { stringValue: childName },
            parentName: { stringValue: selectedParent.fields.name.stringValue },
            breadcrumb: { stringValue: breadcrumbPath },
            children: { mapValue: { fields: {} } },
          },
        });

        const newChild = {
          ...response.data,
          fields: {
            ...response.data.fields,
            breadcrumb: { stringValue: breadcrumbPath },
          },
        };

        const updatedParent = {
          ...selectedParent,
          children: [
            ...(selectedParent.children || []),
            newChild,
          ],
        };

        const updatedData = updateHierarchy(savedData, updatedParent);
        dispatch(setSavedData(updatedData));
      } else {
        response = await axios.post(firebaseUrl, {
          fields: {
            name: { stringValue: childName },
            parentName: { stringValue: parentName },
            breadcrumb: { stringValue: breadcrumbPath },
            children: { mapValue: { fields: {} } },
          },
        });

        const newRoot = {
          ...response.data,
          fields: {
            ...response.data.fields,
            breadcrumb: { stringValue: breadcrumbPath },
          },
        };

        dispatch(setSavedData([...savedData, newRoot]));
      }

      dispatch(clearForm());
    } catch (error) {
      console.error('Error saving data to Firestore:', error);
    }
  };

  const handleEdit = (entry) => {
    dispatch(setEditData(entry));
    dispatch(setParentName(entry.fields?.parentName?.stringValue || ''));
    dispatch(setChildName(entry.fields?.name?.stringValue || ''));
  };

  const handleUpdate = async () => {
    if (!validateForm() || !editData) return;

    try {
      const response = await axios.patch(
        `https://firestore.googleapis.com/v1/${editData.name}`,
        {
          fields: {
            name: { stringValue: childName },
            parentName: { stringValue: parentName },
            breadcrumb: { stringValue: `${parentName} -> ${childName}` },
            children: { mapValue: { fields: {} } },
          },
        }
      );

      const updatedData = savedData.map((item) =>
        item.name === editData.name ? response.data : item
      );

      dispatch(setSavedData(updatedData));
      dispatch(clearForm());
    } catch (error) {
      console.error('Error updating data in Firestore:', error);
    }
  };

  const handleDelete = async (entry) => {
    try {
      await axios.delete(`https://firestore.googleapis.com/v1/${entry.name}`);
      const updatedData = deleteFromHierarchy(savedData, entry.name);
      dispatch(setSavedData(updatedData));
    } catch (error) {
      console.error('Error deleting data from Firestore:', error);
    }
  };

  const deleteFromHierarchy = (data, nameToDelete) => {
    return data.reduce((acc, item) => {
      if (item.name === nameToDelete) {
        return acc;
      }
      if (item.children) {
        const updatedChildren = deleteFromHierarchy(item.children, nameToDelete);
        return [...acc, { ...item, children: updatedChildren }];
      }
      return [...acc, item];
    }, []);
  };

  const updateHierarchy = (data, updatedParent) => {
    return data.map((item) => {
      if (item.name === updatedParent.name) {
        return { ...updatedParent, children: [...updatedParent.children] };
      }
      if (item.children) {
        return {
          ...item,
          children: updateHierarchy(item.children, updatedParent),
        };
      }
      return item;
    });
  };

  return (
    <MantineProvider theme={{
      colorScheme: 'light',
      components: {
        Accordion: {
          styles: {
            item: { borderColor: 'white' },
            control: { borderColor: 'white' },
            panel: { borderColor: 'white' },
          },
        },
      },
    }}>
      <div className="p-5 pt-10" style={{ paddingLeft: '35%', paddingRight: '35%' }}>
        <h1 className="p-5 text-3xl text-green-700">Parent-Child Hierarchy Entry</h1>
        <TextInput
          label="Parent Name"
          value={parentName}
          disabled={parentName}
          onChange={(e) => dispatch(setParentName(e.target.value))}
          readOnly
          className="mb-2.5 w-[400px] text-green-500"
          error={errors.parentName} // Display error message for parent name
        />
        <TextInput
          label="Child Name"
          value={childName}
          onChange={(e) => dispatch(setChildName(e.target.value))}
          className="mb-2.5  w-[400px]  text-green-500"
          error={errors.childName} // Display error message for child name
        />
        <Button onClick={editData ? handleUpdate : handleSave} >
          {editData ? 'Update' : 'Save'}
        </Button>
        <div className="mb-2.5">
          <h3 className="text-green-500" >Hierarchy:</h3>
          <Accordion multiple>
            {savedData.length === 0 ? (
              <p><b className="text-red-500" >No entries saved yet.</b></p>
            ) : (
              renderHierarchy(savedData)
            )}
          </Accordion>
        </div>
      </div>
    </MantineProvider>
  );
};

export default App;
