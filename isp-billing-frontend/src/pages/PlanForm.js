import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Grid, Alert
} from '@mui/material';
import { useApi } from '../contexts/ApiContext';
import { APP_DEFAULT_CURRENCY } from '../utils/helpers';

const EMPTY = {
  name: '',
  price: '',
  dataLimitMB: '',
  validityPeriod: '',
  category: 'basic',
  planType: 'prepaid',
  speed: '',
  description: ''
};

const PlanForm = ({ open, onClose, onSaved }) => {
  const { dataPlansApi } = useApi();
  const [form, setForm] = useState(EMPTY);
  const [error, setError]   = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const reset = () => {
    setForm(EMPTY);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    // quick client‑side validation
    if (!form.name || !form.price || !form.dataLimitMB || !form.validityPeriod) {
      return setError('Please fill all required fields.');
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        category: form.category,
        planType: form.planType,        // prepaid | postpaid
        speed: form.speed.trim() || 'N/A',
        price: Number(form.price),
        validityPeriod: Number(form.validityPeriod),
        // convert MB → bytes
        dataLimit: Number(form.dataLimitMB) * 1024 * 1024,
        isPopular: false,
        features: []
      };

      const res = await dataPlansApi.create(payload);
      if (onSaved) onSaved(res.data.data.dataPlan);
      reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add plan');
    }
  };

  return (
    <Dialog open={open} onClose={reset} maxWidth="sm" fullWidth>
      <DialogTitle>Add Data Plan</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField required fullWidth
              name="name" label="Plan Name"
              value={form.name} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField required fullWidth type="number"
              name="price" label={`Price (${APP_DEFAULT_CURRENCY})`}
              value={form.price} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField required fullWidth type="number"
              name="dataLimitMB" label="Data Limit (MB)"
              value={form.dataLimitMB} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField required fullWidth type="number"
              name="validityPeriod" label="Validity (days)"
              value={form.validityPeriod} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField fullWidth
              name="speed" label="Speed (e.g. 5 Mbps)"
              value={form.speed} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth required
              name="category" label="Category"
              value={form.category} onChange={handleChange}>
              {['basic','standard','premium','enterprise'].map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth required
              name="planType" label="Plan Type"
              value={form.planType} onChange={handleChange}>
              <MenuItem value="prepaid">Pre‑paid</MenuItem>
              <MenuItem value="postpaid">Post‑paid</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline minRows={2}
              name="description" label="Description"
              value={form.description} onChange={handleChange} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={reset}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanForm;
