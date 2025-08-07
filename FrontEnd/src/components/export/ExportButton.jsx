import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, DocumentArrowDownIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { exportToPDF, exportToExcel } from '../../api/export';

const ExportButton = ({ data, fileName, type = 'project' }) => {
  const handleExport = async (format) => {
    try {
      if (format === 'pdf') {
        await exportToPDF(data, fileName, type);
      } else if (format === 'excel') {
        await exportToExcel(data, fileName, type);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
          Export
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => handleExport('pdf')}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex items-center w-full px-4 py-2 text-sm`}
                >
                  <DocumentTextIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
                  Export to PDF
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => handleExport('excel')}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex items-center w-full px-4 py-2 text-sm`}
                >
                  <TableCellsIcon className="mr-3 h-5 w-5 text-green-500" aria-hidden="true" />
                  Export to Excel
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ExportButton;