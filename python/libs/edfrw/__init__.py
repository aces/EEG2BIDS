#! /usr/bin/env python3
# coding=utf-8

'''
Copyright 2017 Antonio González

This file is part of edfrw.

edfrw is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your
option) any later version.

edfrw is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
for more details.

You should have received a copy of the GNU General Public License along
with edfrw. If not, see <http://www.gnu.org/licenses/>.
'''

import sys

if (sys.version_info.major < 3) or (sys.version_info.minor < 5):
    raise Exception('PyDaq requires Python 3.5 or greater')

from .headers import (EdfHeader, EdfSignal, EdfRecordingId, EdfSubjectId)
from .writer import EdfWriter
from .reader import EdfReader


# Convenience function to read or write an EDF file.
def open_edf(filename, mode='r'):
    if mode == 'r':
        return EdfReader(filename)
    elif mode == 'w':
        return EdfWriter(filename)
