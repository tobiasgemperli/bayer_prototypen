import React, { useState } from 'react';
import { Autocomplete, Box, Checkbox, Divider, TextField, Typography } from '@mui/material';
import { Add, CheckBox as CheckBoxIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon } from '@mui/icons-material';
import { fieldSx } from './FormField';

export interface EntityAutocompleteOption {
  id: string;
  label: string;
  /** When any option carries this, the list renders as sections in array
   *  order — a plain Divider between each group, no header text. */
  group?: string;
}

const TRAILING_ACTION_ID = '__trailing_action__';

interface EntityAutocompleteSharedProps {
  options: EntityAutocompleteOption[];
  placeholder?: string;
  autoFocus?: boolean;
  error?: boolean;
  helperText?: string;
  /** Pinned option row appended after the filtered list (e.g. "+ Add laboratory").
   *  `group` places it in a specific section (defaults to the last option's
   *  group) — set this when that section must still appear even empty (e.g.
   *  "Create new treatment plan" always belongs under Simulated, even when
   *  a plot has none yet). */
  trailingAction?: { label: string; onClick: () => void; group?: string };
  /** Custom row content for a normal option. Defaults to its plain label. */
  renderOptionContent?: (option: EntityAutocompleteOption) => React.ReactNode;
  /** Custom content shown over the input while it's closed (e.g. "Two plots
   *  selected", or a name + status badge). Return null/undefined to fall
   *  back to the native input display. */
  renderClosedOverlay?: (selected: EntityAutocompleteOption[]) => React.ReactNode | null | undefined;
}

interface EntityAutocompleteSingleProps extends EntityAutocompleteSharedProps {
  multiple?: false;
  value: string;
  onChange: (id: string) => void;
}

interface EntityAutocompleteMultiProps extends EntityAutocompleteSharedProps {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

export type EntityAutocompleteProps = EntityAutocompleteSingleProps | EntityAutocompleteMultiProps;

/**
 * Single source for the "closed state shows custom content instead of the
 * native input" Autocomplete pattern — originally the Lab picker's inline
 * name + API-connection badge. Generalized so a multi-select consumer (e.g.
 * a plots picker) gets the exact same mechanics: while closed, the input's
 * own text is made transparent and `renderClosedOverlay` is painted on top
 * (pointer-events disabled, so clicks still reach the Autocomplete); while
 * open, the overlay is hidden so normal typing/search works.
 * Do NOT re-implement this trick locally — extend this component instead.
 */
export function EntityAutocomplete(props: EntityAutocompleteProps) {
  const {
    options, placeholder, autoFocus, error, helperText,
    trailingAction, renderOptionContent, renderClosedOverlay,
  } = props;
  const [open, setOpen] = useState(false);

  const byId = new Map(options.map((o) => [o.id, o]));
  const selectedIds = props.multiple ? props.value : (props.value ? [props.value] : []);
  const selectedOptions = selectedIds
    .map((id) => byId.get(id))
    .filter((o): o is EntityAutocompleteOption => !!o);

  const hasGroups = options.some((o) => o.group != null);
  const firstGroup = options[0]?.group;
  // Defaults to joining the last section (no extra divider after it) unless
  // the caller pins it to a specific group.
  const allOptions = trailingAction
    ? [...options, {
        id: TRAILING_ACTION_ID, label: trailingAction.label,
        group: trailingAction.group ?? options[options.length - 1]?.group,
      }]
    : options;

  const overlay = renderClosedOverlay?.(selectedOptions);
  const showOverlay = !open && !!overlay;

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        size="small"
        multiple={!!props.multiple}
        disableCloseOnSelect={!!props.multiple}
        options={allOptions}
        groupBy={hasGroups ? (opt: EntityAutocompleteOption) => opt.group ?? '' : undefined}
        renderGroup={(params) => (
          <li key={params.key}>
            {params.group !== firstGroup && <Divider sx={{ my: 0.5 }} />}
            <Box component="ul" sx={{ p: 0, m: 0 }}>{params.children}</Box>
          </li>
        )}
        value={(props.multiple ? selectedOptions : (selectedOptions[0] ?? null)) as any}
        isOptionEqualToValue={(o: EntityAutocompleteOption, v: EntityAutocompleteOption) => o.id === v.id}
        getOptionLabel={(opt: EntityAutocompleteOption) => opt.label}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        filterOptions={(opts, state) => (opts as EntityAutocompleteOption[]).filter(
          (o) => o.id === TRAILING_ACTION_ID || o.label.toLowerCase().includes(state.inputValue.toLowerCase())
        )}
        onChange={(_, next) => {
          if (props.multiple) {
            const arr = (next as EntityAutocompleteOption[]).filter((o) => o.id !== TRAILING_ACTION_ID);
            props.onChange(arr.map((o) => o.id));
          } else {
            const single = next as EntityAutocompleteOption | null;
            if (single?.id === TRAILING_ACTION_ID) { trailingAction?.onClick(); return; }
            props.onChange(single?.id ?? '');
          }
        }}
        renderOption={(liProps, option: EntityAutocompleteOption) => {
          const { key, ...rest } = liProps as any;
          if (option.id === TRAILING_ACTION_ID) {
            return (
              <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>
                  {option.label}
                </Typography>
              </li>
            );
          }
          return (
            <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
              {props.multiple && (
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  style={{ marginRight: 4, padding: 0 }}
                  checked={selectedIds.includes(option.id)}
                />
              )}
              {renderOptionContent ? renderOptionContent(option) : option.label}
            </li>
          );
        }}
        renderTags={() => null}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus={autoFocus}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            sx={fieldSx}
            inputProps={{
              ...params.inputProps,
              style: {
                ...(params.inputProps as any)?.style,
                ...(showOverlay ? { color: 'transparent', caretColor: 'transparent' } : {}),
              },
            }}
          />
        )}
      />
      {showOverlay && (
        <Box
          sx={{
            position: 'absolute', top: 0, bottom: 0, left: '14px', right: '40px',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {overlay}
        </Box>
      )}
    </Box>
  );
}
