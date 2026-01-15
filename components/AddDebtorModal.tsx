import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { Debtor, DebtorType } from '../types';

interface AddDebtorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debtor: Debtor) => void;
  debtor?: Debtor | null; // For editing
}

const AddDebtorModal: React.FC<AddDebtorModalProps> = ({ isOpen, onClose, onSave, debtor }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtorType>('customer');

  useEffect(() => {
    if (debtor) {
      setName(debtor.name);
      setType(debtor.type);
    } else {
      setName('');
      setType('customer');
    }
  }, [debtor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: debtor?.id || Date.now().toString(),
      name: name.trim(),
      type: type,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">{debtor ? t('ar_edit_debtor', 'Editar Deudor') : t('ar_add_debtor', 'Añadir Deudor')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="debtorName" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_debtor_name', 'Nombre del Deudor')}</label>
            <input
              type="text"
              id="debtorName"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('ar_debtor_name_placeholder', 'Ej: Rappi, Cliente Corporativo, Juan Pérez')}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="debtorType" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_debtor_type', 'Tipo de Deudor')}</label>
            <select
              id="debtorType"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={type}
              onChange={(e) => setType(e.target.value as DebtorType)}
            >
              <option value="customer">{t('ar_debtor_type_customer', 'Cliente Directo')}</option>
              <option value="delivery_platform">{t('ar_debtor_type_delivery_platform', 'Plataforma de Delivery')}</option>
              <option value="employee">{t('ar_debtor_type_employee', 'Empleado')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              {t('ar_cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-300"
            >
              {t('ar_save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtorModal;