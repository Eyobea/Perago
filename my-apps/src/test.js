import React, { useState } from 'react';
import { db } from './firebaseConfig'; // Adjust the import as necessary
import { addDoc, collection, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Timeline } from '@mantine/core';

const initialPositions = [
    { id: '1', name: 'Position 1', children: [] },
];

const App = () => {
    const [positions, setPositions] = useState(initialPositions);
    const [newPosition, setNewPosition] = useState({ id: null, value: '' });
    const [isEditing, setIsEditing] = useState({ id: null, status: false });

    const addPosition = async (parentId) => {
        if (!newPosition.value) return;

        const newPositionObj = {
            name: newPosition.value,
            children: [],
        };

        try {
            const positionsCollectionRef = collection(db, 'positions');
            const docRef = await addDoc(positionsCollectionRef, newPositionObj);
            const updatedPositions = updatePositions(positions, parentId, docRef.id, newPositionObj);
            setPositions(updatedPositions);
        } catch (error) {
            console.error("Error adding position:", error);
        } finally {
            setNewPosition({ id: null, value: '' });
        }
    };

    const updatePositions = (positions, parentId, newId, newPositionObj) => {
        return positions.map((position) => {
            if (position.id === parentId) {
                return {
                    ...position,
                    children: [...position.children, { id: newId, ...newPositionObj }],
                };
            }
            return {
                ...position,
                children: updatePositions(position.children, parentId, newId, newPositionObj),
            };
        });
    };

    const editPosition = async (id, newName) => {
        if (!newName) return;

        try {
            const positionDocRef = doc(db, 'positions', id);
            const docSnapshot = await getDoc(positionDocRef);
            if (!docSnapshot.exists()) {
                console.error("No document to update:", id);
                return;
            }

            const updatedPositions = editChildren(positions, id, newName);
            setPositions(updatedPositions);
            await updateDoc(positionDocRef, { name: newName });
        } catch (error) {
            console.error("Error updating position:", error);
        }
    };

    const editChildren = (positions, id, newName) => {
        return positions.map((position) => {
            if (position.id === id) {
                return { ...position, name: newName };
            }
            return { ...position, children: editChildren(position.children, id, newName) };
        });
    };

    const deletePosition = async (id) => {
        if (!id) return;

        const deletePositionRecursively = (positions) => {
            return positions.filter((position) => {
                if (position.id === id) {
                    return false; // Remove this position
                }
                position.children = deletePositionRecursively(position.children);
                return true; // Keep this position
            });
        };

        try {
            const updatedPositions = deletePositionRecursively(positions);
            setPositions(updatedPositions);
            const positionDocRef = doc(db, 'positions', id);
            await deleteDoc(positionDocRef);
        } catch (error) {
            console.error("Error deleting position:", error);
        }
    };

    const renderTimeline = (positions, depth = 0) => {
        return positions.map((position) => (
            <Timeline.Item key={position.id} bulletSize={24} lineWidth={2} color="blue">
                <span>{position.name}</span>
                <div style={{ marginLeft: '20px' }}>
                    {/* Input field and buttons for add, edit, delete */}
                    <input
                        type="text"
                        placeholder="New Position"
                        value={newPosition.id === position.id ? newPosition.value : ''}
                        onChange={(e) => setNewPosition({ id: position.id, value: e.target.value })}
                    />
                    <button onClick={() => addPosition(position.id)} disabled={!newPosition.value}>
                        Add
                    </button>
                    <button onClick={() => {
                        if (isEditing.id === position.id) {
                            editPosition(position.id, newPosition.value);
                            setIsEditing({ id: null, status: false });
                        } else {
                            setIsEditing({ id: position.id, status: true });
                        }
                    }}>
                        {isEditing.id === position.id ? 'Save' : 'Edit'}
                    </button>
                    <button onClick={() => deletePosition(position.id)}>
                        Delete
                    </button>
                </div>
                {/* Recursively render children in timeline */}
                {position.children.length > 0 && (
                    <div style={{ marginLeft: '20px' }}>
                        <Timeline active={depth + 1}>
                            {renderTimeline(position.children, depth + 1)}
                        </Timeline>
                    </div>
                )}
            </Timeline.Item>
        ));
    };

    return (
        <div>
            <h1>Employee Positions</h1>
            <Timeline active={0} reverseActive lineWidth={3} bulletSize={24}>
                {renderTimeline(positions)}
            </Timeline>
        </div>
    );
};

export default App;
