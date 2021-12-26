//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { createTheme, IconButton, InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { makeStyles } from '@mui/styles'; // TODO(burdon): Remove.

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flex: 1
  },
  searchIcon: {
    marginRight: theme.spacing(1)
  }
}), { defaultTheme: createTheme({}) });

export const SearchBar = ({ classes = {}, onUpdate = console.debug }) => {
  const clazzes = { ...useStyles(), ...classes };
  const [text, setText] = useState('');

  const handleSearch = () => {
    onUpdate(text);
  };

  const handleCancel = () => {
    setText('');
    onUpdate('');
  };

  const handleKeyDown: TextFieldProps['onKeyUp'] = ev => {
    switch (ev.key) {
      case 'Escape': {
        handleCancel();
        break;
      }
      case 'Enter': {
        handleSearch();
        break;
      }
    }
  };

  return (
    <div className={clazzes.root}>
      <TextField
        autoFocus
        fullWidth
        variant='outlined'
        spellCheck={false}
        value={text}
        onChange={ev => setText(ev.target.value)}
        onKeyUp={handleKeyDown}
        InputProps={{
          startAdornment:
            <InputAdornment position='end'>
              <IconButton
                className={clazzes.searchIcon}
                size='small'
                onClick={handleSearch}
                onMouseDown={handleSearch}
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>,
          endAdornment:
            <InputAdornment position='end'>
              <IconButton
                size='small'
                onClick={handleCancel}
                onMouseDown={handleCancel}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
        }}
      />
    </div>
  );
};
