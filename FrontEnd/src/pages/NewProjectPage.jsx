/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Listbox } from '@headlessui/react';

import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';

const phases = [
  { value: 'PLAN', label: 'Planning' },
  { value: 'DEV', label: 'Development' },
  { value: 'TEST', label: 'Testing' },
  { value: 'PROD', label: 'Serial Production' },
  { value: 'COMP', label: 'Completed' },
];

const schema = z.object({
  code: z.string().regex(/^100000000\d+-01S$/, 'Code must match pattern 100000000<number>-01S'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  manager: z.string().min(1, 'Manager is required'),
  start_date: z.date(),
  end_date: z.date(),
  current_phase: z.enum(phases.map(p => p.value)),
}).refine(data => data.start_date <= data.end_date, {
  message: "Start date can't be after end date",
  path: ['end_date'],
});

const NewProjectPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [serverError, setServerError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      description: '',
      manager: '',
      start_date: null,
      end_date: null,
      current_phase: 'PLAN',
    },
  });

  const codeValue = watch('code');

  // Async code validation debounced
  const validateCodeAsync = useCallback(
    debounce(async (code, setError, clearErrors) => {
      if (!code || !/^100000000\d+-01S$/.test(code)) return;

      setCheckingCode(true);
      try {
        const res = await api.get('/projects/check-code', { params: { code } });
        if (res.data.exists) {
          setError('code', {
            type: 'manual',
            message: 'This code is already taken.',
          });
        } else {
          clearErrors('code');
        }
      } catch (e) {
        // silently ignore or log
        console.error('Code check error:', e);
      } finally {
        setCheckingCode(false);
      }
    }, 700),
    []
  );

  // Watch code and run async validation
  useEffect(() => {
    if (!codeValue) return;
    validateCodeAsync(codeValue, setError, clearErrors);
  }, [codeValue, validateCodeAsync]);

  // You need to destructure setError and clearErrors from useForm
  const { setError, clearErrors } = useForm();

  // Fetch managers on mount
  useEffect(() => {
    const fetchManagers = async () => {
      setLoadingManagers(true);
      try {
        const response = await api.get('/users/');
        const pmUsers = response.data.filter(u => u.role === 'PM');
        setManagers(pmUsers);

        if (user?.role === 'PM') {
          setValue('manager', user.id);
        } else if (pmUsers.length > 0) {
          setValue('manager', pmUsers[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch managers', err);
        setServerError('Failed to load managers. Try refreshing.');
      } finally {
        setLoadingManagers(false);
      }
    };
    fetchManagers();
  }, [user, setValue]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      // Convert Date objects to ISO strings
      const payload = {
        ...data,
        start_date: data.start_date.toISOString().split('T')[0],
        end_date: data.end_date.toISOString().split('T')[0],
      };

      await api.post('/projects/', payload);
      toast.success('Project created successfully!');
      reset(); // reset form after success
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setServerError('Failed to create project. Check inputs and try again.');
      toast.error('Failed to create project.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-lg mt-10">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-900">Create New Project</h1>

      {serverError && (
        <div className="mb-6 flex items-center justify-between bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
          <p className="font-semibold">{serverError}</p>
          <button
            onClick={() => setServerError('')}
            aria-label="Dismiss error message"
            className="ml-4 text-red-700 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
          >
            &#x2715;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        <div>
          <label htmlFor="code" className="block mb-1 font-semibold text-gray-700">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            {...register('code')}
            placeholder="e.g. 1000000002-01S"
            className={`w-full border rounded-md px-4 py-3 text-gray-700 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
            aria-invalid={!!errors.code}
            aria-describedby="codeError"
          />
          {checkingCode && <p className="text-blue-600 text-sm mt-1">Checking code availability...</p>}
          {errors.code && (
            <p id="codeError" className="mt-1 text-red-600 text-sm">{errors.code.message}</p>
          )}
          {!errors.code && !checkingCode && (
            <p className="mt-1 text-gray-500 text-sm">Format: <code>100000000[number]-01S</code></p>
          )}
        </div>

        <div>
          <label htmlFor="name" className="block mb-1 font-semibold text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className={`w-full border rounded-md px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
              ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            aria-invalid={!!errors.name}
            aria-describedby="nameError"
          />
          {errors.name && (
            <p id="nameError" className="mt-1 text-red-600 text-sm">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block mb-1 font-semibold text-gray-700">Description</label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
          />
        </div>

        <div>
          <label htmlFor="manager" className="block mb-1 font-semibold text-gray-700">
            Manager <span className="text-red-500">*</span>
          </label>
          {loadingManagers ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <Spinner />
              <span>Loading managers...</span>
            </div>
          ) : (
            <select
              id="manager"
              {...register('manager')}
              className={`w-full border rounded-md px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
                ${errors.manager ? 'border-red-500' : 'border-gray-300'}`}
              aria-invalid={!!errors.manager}
              aria-describedby="managerError"
            >
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name || m.username} {m.last_name || ''}
                </option>
              ))}
            </select>
          )}
          {errors.manager && (
            <p id="managerError" className="mt-1 text-red-600 text-sm">{errors.manager.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block mb-1 font-semibold text-gray-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="start_date"
              render={({ field }) => (
                <DatePicker
                  placeholderText="Select start date"
                  className={`w-full border rounded-md px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
                    ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="yyyy-MM-dd"
                  id="start_date"
                  aria-invalid={!!errors.start_date}
                  aria-describedby="startDateError"
                />
              )}
            />
            {errors.start_date && (
              <p id="startDateError" className="mt-1 text-red-600 text-sm">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="end_date" className="block mb-1 font-semibold text-gray-700">
              End Date <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="end_date"
              render={({ field }) => (
                <DatePicker
                  placeholderText="Select end date"
                  className={`w-full border rounded-md px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
                    ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="yyyy-MM-dd"
                  id="end_date"
                  aria-invalid={!!errors.end_date}
                  aria-describedby="endDateError"
                  minDate={watch('start_date') || null}
                />
              )}
            />
            {errors.end_date && (
              <p id="endDateError" className="mt-1 text-red-600 text-sm">{errors.end_date.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="current_phase" className="block mb-1 font-semibold text-gray-700">
            Phase <span className="text-red-500">*</span>
          </label>
          <Controller
            name="current_phase"
            control={control}
            render={({ field }) => (
              <Listbox value={field.value} onChange={field.onChange}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-3 pl-4 pr-10 text-left text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <span className="block truncate">
                      {phases.find(p => p.value === field.value)?.label}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {phases.map((phase) => (
                      <Listbox.Option
                        key={phase.value}
                        value={phase.value}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4  ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-semibold' : ''}`}>
                              {phase.label}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
                                <svg
                                  className="h-5 w-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            )}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || checkingCode}
          className={`w-full py-3 rounded-md text-white font-bold transition
            ${(isSubmitting || checkingCode) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'}`}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex justify-center items-center space-x-2">
              <Spinner />
              <span>Creating...</span>
            </div>
          ) : (
            'Create Project'
          )}
        </button>
      </form>
    </div>
  );
};

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

export default NewProjectPage;
