import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { AppState } from '../types';

const DataMigrator: React.FC = () => {
    const { state } = useAppContext();
    const [isMigrating, setIsMigrating] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const migrateCollection = async (batch: any, collectionName: string, items: any[]) => {
        if (!items || items.length === 0) return;
        addLog(`Preparing ${items.length} items for ${collectionName}...`);
        items.forEach(item => {
            // Ensure item has an ID, or generate one
            const id = item.id || doc(collection(db, collectionName)).id;
            // Sanitize item: remove undefined values if necessary, though Firestore handles some.
            // We perform a shallow copy.
            const data = { ...item };
            // Dates: Firestore prefers Timestamps or ISO strings. Our app uses ISO strings YYYY-MM-DD or full ISO.
            // We will keep them as strings for now to match current types.

            const ref = doc(db, collectionName, id);
            batch.set(ref, data);
        });
    };

    const handleMigration = async () => {
        if (!window.confirm("Esto subirá todos los datos locales actuales a Firebase. Asegúrate de que tu base de datos en Firebase esté vacía o que no te importe sobrescribir duplicados si los IDs coinciden.")) {
            return;
        }

        setIsMigrating(true);
        setLog([]);
        addLog("Starting migration...");

        try {
            // Firestore batch has a limit of 500 operations. We need to handle this.
            // Function to process in chunks
            const allOperations: { collection: string, item: any }[] = [];

            // Collect all items to be migrated
            const collectionsToMigrate: (keyof AppState)[] = [
                'incomeTypes',
                'expenseTypes',
                'paymentMethods',
                'currencies',
                'denominations',
                'bankAccounts',
                'transactions',
                'dailySales',
                'invoices',
                'miscIncomes',
                'cashClosures',
                'cashExpenses',
                'ipcRecords',
                'exchangeRates',
                'budgetRecords',
                'debtors',
                'accountsReceivable',
                'taxes'
            ];

            collectionsToMigrate.forEach(key => {
                const items = state[key];
                if (Array.isArray(items)) {
                    items.forEach((item: any) => {
                        allOperations.push({ collection: key, item });
                    });
                }
            });

            addLog(`Total items to migrate: ${allOperations.length}`);

            const chunkSize = 450; // Safety margin below 500
            const chunks = [];
            for (let i = 0; i < allOperations.length; i += chunkSize) {
                chunks.push(allOperations.slice(i, i + chunkSize));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const batch = writeBatch(db);

                chunk.forEach(op => {
                    const id = op.item.id ? String(op.item.id) : doc(collection(db, op.collection)).id;
                    const ref = doc(db, op.collection, id);
                    batch.set(ref, op.item);
                });

                addLog(`Committing batch ${i + 1} of ${chunks.length}...`);
                await batch.commit();
                setProgress(((i + 1) / chunks.length) * 100);
            }

            addLog("Migration completed successfully!");

        } catch (error) {
            console.error(error);
            addLog(`Error during migration: ${error}`);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-blue-500/50 my-6">
            <h3 className="text-xl font-bold text-white mb-2">Firebase Data Migrator</h3>
            <p className="text-gray-400 mb-4">Use this tool to push your current local data to the configured Firebase project.</p>

            <button
                onClick={handleMigration}
                disabled={isMigrating}
                className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-colors ${isMigrating ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isMigrating ? 'Migrating...' : 'Start Migration to Firebase'}
            </button>

            {isMigrating && (
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <div className="mt-4 bg-gray-900 p-3 rounded-md max-h-40 overflow-y-auto font-mono text-xs text-green-400">
                {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
        </div>
    );
};

export default DataMigrator;
