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
import struct
import numpy as np

from python.libs.edfrw import (EdfHeader, EdfSignal)


def header_fromfile(filename):
    # String that represents the first 256 bytes in the header in the
    # format required by struct.unpack
    hdr_fmt = '<'
    for size in EdfHeader._sizes:
        hdr_fmt += '{}s'.format(size)

    # Main header (first 256 characters in EDF file)
    header = EdfHeader()
    with open(filename, 'rb') as edffile:
        edffile.seek(0)
        hdr_str = edffile.read(256)

        # Unpack the header
        hdr_str = struct.unpack(hdr_fmt, hdr_str)
        # Convert from bytes to str
        hdr_str = [field.decode('ascii') for field in hdr_str]
        # update Header with the new values
        for (field, value) in zip(EdfHeader._fields, hdr_str):
            setattr(header, field, value)

        # Signal header.
        # After the main header (256 bytes) there are an additional 256
        # bytes of header for each signal. The curious thing is that
        # each entry is repeated ns times (instead of having all entries
        # for one signal, then all entries for the next signal, etc).
        # So each entry must be read 'ns' times, where 'ns' is the
        # number of signals in the file.
        edffile.seek(256)
        sig_str = edffile.read(256 * header.number_of_signals)

    sig_sizes = np.array(EdfSignal._sizes).repeat(
            header.number_of_signals)
    # String that represents bytes in the header that contain signal
    # information (as required by struct.unpack)
    sig_fmt = '<'
    for size in sig_sizes:
        sig_fmt += '{}s'.format(size)
    sig_str = struct.unpack(sig_fmt, sig_str)

    signals = []
    for n in range(header.number_of_signals):
        new_signal = EdfSignal()
        new_signal_str = sig_str[n::header.number_of_signals]
        for index, field in enumerate(EdfSignal._fields):
            value = new_signal_str[index].decode('ascii')
            setattr(new_signal, field, value)
        # The EdfSignal attribute 'sampling_freq' is not part of the EDF
        # specification but it is useful, so it is added.
        new_signal.sampling_freq = (
                new_signal.number_of_samples_in_data_record /
                header.duration_of_data_record)
        signals.append(new_signal)

    header.signals = signals
    return header


class EdfReader(object):
    def __init__(self, filename):
        self.header = header_fromfile(filename)
        self.filename = filename
        self.open()

    def open(self):
        self._f = open(self.filename, mode = 'rb')

    def read_record(self, rec_number):
        # TODO This function is still incomplete
        """
        Returns data from record *rec_number*.
        """
        if rec_number > self.header.number_of_data_records:
            msg = ('There are ' +
                   str(self.header.number_of_data_records) +
                   ' data records ' +
                   '(you requested record ' +
                   str(rec_number))
            print(msg)
            return
        pointer = (
                (rec_number *
                 self.header.number_of_samples_in_data_record) +
                self.header.number_of_bytes_in_header)
        self._f.seek(pointer)
        # Data are saved as int16, so the number of bytes to read is
        # twice the number of samples requested.
        nsamples = self.header.number_of_samples_in_data_record * 2
        samples = self._f.read(nsamples)
        samples = np.frombuffer(samples, 'int16')
        return samples

    def close(self):
        self._f.close()


if __name__ == "__main__":
    edf = EdfReader('../daq/data/SC4181E0-PSG.edf')
    edf.header.print()
