import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { X, Plus, Pencil, Trash2, Users } from 'lucide-react';
import AddDebtorModal from './AddDebtorModal';
import { Debtor } from '../types';

interface DebtorManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebtorManagementModal: React.FC<DebtorManagementModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { state, addDebtor, updateDebtor, deleteDebtor } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);

    if (!isOpen) return null;

    const handleEdit = (debtor: Debtor) => {
        setEditingDebtor(debtor);
        setIsAddModalOpen(true);
    };

    const handleAdd = () => {
        setEditingDebtor(null);
        setIsAddModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('ar_delete_debtor_confirm'))) {
            deleteDebtor(id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Users size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                            {t('ar_debtors_title')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto grow space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {state.debtors.length} {t('ar_debtors_title')}
                        </p>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm"
                        >
                            <Plus size={18} />
                            {t('ar_add_debtor')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {state.debtors.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-400 italic">
                                {t('ar_no_debtors')}
                            </div>
                        ) : (
                            state.debtors.map((debtor) => (
                                <div
                                    key={debtor.id}
                                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-all"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 dark:text-white">{debtor.name}</span>
                                        <span className="text-xs px-2 py-0.5 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-500 dark:text-gray-400 w-fit">
                                            {t(`ar_debtor_type_${debtor.type}`)}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(debtor)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(debtor.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        {t('ar_cancel')}
                    </button>
                </div>
            </div>

            <AddDebtorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                debtor={editingDebtor}
                onSave={(debtor) => {
                    if (editingDebtor) {
                        updateDebtor({ ...editingDebtor, ...debtor });
                    } else {
                        addDebtor(debtor);
                    }
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default DebtorManagementModal;
