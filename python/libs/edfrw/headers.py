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
import warnings
import datetime as dt

EDF_HDR_DATE_FMT = '%d.%m.%y'
EDF_HDR_TIME_FMT = '%H.%M.%S'
EDF_DOB_FMT = EDF_RECDATE_FMT = '%d-%b-%Y'
ISO_DATE_FMT = '%Y-%m-%d'


class EdfHeaderException(Exception):
    pass


class EdfSubjectId:
    '''
    The subject (patient) identification is a string (80 characters
    long) in the header of a EDF file than contains information about
    the patient's code, name, sex, and date of birth.

    This class handles that information. It is seldom useful on its own
    but rather as an attribute of `class::Header`.
    '''
    _len = 80
    __slots__ = ['_code', '_sex', '_dob', '_name']

    def __init__(self, code='', sex='', dob='', name=''):
        '''
        Properties that identify the subject.

        `code` is the patient code
        `sex` is 'M', 'F', or 'X'
        `dob` is date of birth
        `name` is the patient's name

        If any field is not known it can be entered as 'X' (as per
        EDF standard) or as an empty string ''.
        '''
        self.code = code
        self.sex = sex
        self.dob = dob
        self.name = name

    @property
    def code(self):
        return self._code

    @code.setter
    def code(self, code):
        code = code.strip()
        if not code:
            code = 'X'
        self._code = code.replace(' ', '_')

    @property
    def sex(self):
        return self._sex

    @sex.setter
    def sex(self, sex):
        sex = sex.strip()
        if not sex:
            sex = 'X'
        if sex not in ('M', 'F', 'X'):
            error = ("'sex' can only be 'M' (male), 'F' (female), or" +
                     " 'X' (unknown)")
            raise ValueError(error)
        self._sex = sex

    @property
    def dob(self):
        return self._dob

    @dob.setter
    def dob(self, dob):
        '''
        If DOB is not known it must be an empy string '' or 'X'. If it
        is known, it must be entered as

        (a) a string in EDF format 'dd-MMM-yy', as in '30-DEC-1999';
        (b) a string in iso format 'yyyy-mm-dd', as in '1999-12-30'; or
        (c) a datetime object.

        In any case the date will be stored as a datetime.date object.
        '''
        if (not dob) or (dob == 'X'):
            self._dob = 'X'
        elif isinstance(dob, dt.datetime):
            self._dob = dob.date()
        elif isinstance(dob, dt.date):
            self._dob = dob
        elif isinstance(dob, str):
            try:
                dob = dt.datetime.strptime(dob, ISO_DATE_FMT)
            except ValueError:
                try:
                    dob = dt.datetime.strptime(dob, EDF_DOB_FMT)
                except ValueError as error:
                    raise ValueError(error)
            self._dob = dob.date()
        else:
            raise ValueError('Invalid date format')

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        name = name.strip()
        if not name:
            name = 'X'
        self._name = name.replace(' ', '_')

    def to_str(self):
        try:
            dob = self._dob.strftime(EDF_DOB_FMT)
        except:
            dob = 'X'
        patient_id = '{} {} {} {}'.format(
            self.code, self.sex, dob, self.name)
        if len(patient_id) > self._len:
            raise EdfHeaderException("SubjectId header is too long")
        return patient_id

    def __format__(self, format_spec):
        fmt = self.to_str()
        return format(fmt, format_spec)

    def __str__(self):
        return self.to_str()


class EdfRecordingId:
    '''
    The recording identification is a string of 80 characters in the
    header of a EDF file. It contains information about the start date,
    experiment ID, investigator ID, and equipment code, each of these
    separated by a space.

    This class handles that information. It is seldom useful on its own
    but rather as an attribute of `class::Header`.
    '''
    _len = 80
    __slots__ = ['_startdate', '_experiment_id', '_investigator_id',
                 '_equipment_code']

    def __init__(self, startdate=None, experiment_id='',
                 investigator_id='', equipment_code=''):
        self.startdate = startdate
        self.experiment_id = experiment_id
        self.investigator_id = investigator_id
        self.equipment_code = equipment_code

    @property
    def startdate(self):
        """
        *startdate* input expected to be:
            (a) a string in isoformat ('yyyy-mm-dd'), or
            (b) a `datetime` instance, as in e.g. datetime.now(), or
            (c) a date string with format '%d-%b-%Y', which is the
                format required by EDF for this field.
            (d) None, in which case the current date will be used.
        In all cases startdate will be saved as a datetime object.
        """
        return self._startdate

    @startdate.setter
    def startdate(self, startdate):
        # If startdate is None, create one using current date.
        if startdate is None:
            self._startdate = dt.datetime.now().date()
        elif isinstance(startdate, dt.datetime):
            self._startdate = startdate.date()
        elif isinstance(startdate, dt.date):
            self._startdate = startdate
        # If startdate is a string, try to convert to datetime. A
        # ValueError is raised if the format does not match.
        elif isinstance(startdate, str):
            try:
                startdate = dt.datetime.strptime(startdate, ISO_DATE_FMT)
            except ValueError:
                try:
                    startdate = dt.datetime.strptime(startdate,
                                                     EDF_RECDATE_FMT)
                except ValueError as error:
                    raise ValueError(error)
            self._startdate = startdate.date()
        else:
            raise ValueError('Invalid date format')

    @property
    def experiment_id(self):
        return self._experiment_id

    @experiment_id.setter
    def experiment_id(self, experiment_id):
        experiment_id = experiment_id.strip()
        if not experiment_id:
            experiment_id = 'X'
        self._experiment_id = experiment_id.replace(' ', '_')

    @property
    def investigator_id(self):
        return self._investigator_id

    @investigator_id.setter
    def investigator_id(self, investigator_id):
        investigator_id = investigator_id.strip()
        if not investigator_id:
            investigator_id = 'X'
        self._investigator_id = investigator_id.replace(' ', '_')

    @property
    def equipment_code(self):
        return self._equipment_code

    @equipment_code.setter
    def equipment_code(self, equipment_code):
        equipment_code = equipment_code.strip()
        if not equipment_code:
            equipment_code = 'X'
        self._equipment_code = equipment_code.replace(' ', '_')

    def to_str(self):
        rec_id = 'Startdate {} {} {} {}'.format(
            self.startdate.strftime(EDF_RECDATE_FMT),
            self.experiment_id,
            self.investigator_id,
            self.equipment_code)
        if len(rec_id) > self._len:
            raise EdfHeaderException('RecordingId header is too long')
        return rec_id

    def __format__(self, format_spec):
        fmt = self.to_str()
        return format(fmt, format_spec)

    def __str__(self):
        return self.to_str()


class EdfSignal(object):
    """
    Properties of a signal in an EDF file.

    These properties are stored in the header of an EDF file (after
    the first 256 bytes which contain the 'main' header). Each signal
    header is 256 bytes long.

    *physical_dim*
        Physical dimension. A string that must start with a 'prefix'
        (e.g. 'u' for 'micro') followed by the 'basic dimension' (e.g.
        'V' for volts). Other examples of basic dimensions are  'K',
        'degC' or 'degF' for temperature, and '%' for SaO2. Powers  are
        denotes by '^', as in 'V^2/Hz'. An empty string represents an
        uncalibrated signal. For standards on labels and units, see
        http://www.edfplus.info/specs/edftexts.html
    """

    (LABEL, TRANSDUCER_TYPE, PHYSICAL_DIM, PHYSICAL_MIN, PHYSICAL_MAX,
     DIGITAL_MIN, DIGITAL_MAX, PREFILTERING, NSAMPLES, RESERVED
     ) = range(10)

    _fields = ('label', 'transducer_type', 'physical_dim',
               'physical_min', 'physical_max', 'digital_min',
               'digital_max', 'prefiltering',
               'number_of_samples_in_data_record', 'reserved')

    # Byte size of each field
    _sizes = (16, 80, 8, 8, 8, 8, 8, 80, 8, 32)

    # Slots are created by prepending an underscore to each field. Extra
    # extra fields 'sampling_freq' and 'gain' (not part of the EDF
    # specification) are added for convenience.
    __slots__ = ['_' + field for field in _fields]
    __slots__.append('sampling_freq')
    __slots__.append('gain')

    def __init__(self, label='', transducer_type='', physical_dim='',
                 physical_min=-1, physical_max=1, digital_min=-32768,
                 digital_max=32767, prefiltering='',
                 number_of_samples_in_data_record=0, sampling_freq=0):
        # initialise these values arbitrarily to aoid errors in
        # _update_gain, which is called every time the values are set
        # by their @property setters.
        self._digital_min = 0
        self._digital_max = 1
        self._physical_min = 0
        self._physical_max = 1

        # Set EDF fields.
        self.label = label
        self.transducer_type = transducer_type
        self.physical_dim = physical_dim
        self.physical_min = physical_min
        self.physical_max = physical_max
        self.digital_min = digital_min
        self.digital_max = digital_max
        self.prefiltering = prefiltering
        self.number_of_samples_in_data_record = \
            number_of_samples_in_data_record
        self.reserved = ''

        # Not part of the specification
        self.sampling_freq = sampling_freq

    @property
    def label(self):
        return self._label

    @label.setter
    def label(self, value):
        size = self._sizes[self.LABEL]
        if len(value) > size:
            warnings.warn('Label is too long.')
            value = value[:size]
        self._label = value.strip()  # replace(' ', '_')

    @property
    def transducer_type(self):
        return self._transducer_type

    @transducer_type.setter
    def transducer_type(self, value):
        size = self._sizes[self.TRANSDUCER_TYPE]
        if len(value) > size:
            warnings.warn('Transducer type too long.')
            value = value[:size]
        self._transducer_type = value.strip()

    @property
    def physical_dim(self):
        return self._physical_dim

    @physical_dim.setter
    def physical_dim(self, value):
        size = self._sizes[self.PHYSICAL_DIM]
        if len(value) > size:
            warnings.warn('Physical dimension is too long.')
            value = value[:size]
        self._physical_dim = value.strip()

    @property
    def physical_min(self):
        return self._physical_min

    @physical_min.setter
    def physical_min(self, value):
        self._physical_min = float(value)
        self._update_gain()

    @property
    def physical_max(self):
        return self._physical_max

    @physical_max.setter
    def physical_max(self, value):
        self._physical_max = float(value)
        self._update_gain()

    @property
    def digital_min(self):
        return self._digital_min

    @digital_min.setter
    def digital_min(self, value):
        self._digital_min = int(value)
        self._update_gain()

    @property
    def digital_max(self):
        return self._digital_max

    @digital_max.setter
    def digital_max(self, value):
        self._digital_max = int(value)
        self._update_gain()

    @property
    def prefiltering(self):
        return self._prefiltering

    @prefiltering.setter
    def prefiltering(self, value):
        size = self._sizes[self.PREFILTERING]
        if len(value) > size:
            warnings.warn('Prefiltering is too long.')
            value = value[:size]
        self._prefiltering = value.strip()

    @property
    def number_of_samples_in_data_record(self):
        return self._number_of_samples_in_data_record

    @number_of_samples_in_data_record.setter
    def number_of_samples_in_data_record(self, value):
        self._number_of_samples_in_data_record = int(value)

    @property
    def reserved(self):
        return self._reserved

    @reserved.setter
    def reserved(self, value):
        self._reserved = value.strip()

    def __str__(self):
        return self.label

    def __repr__(self):
        return '<EDFSignal ' + self.label + '>'

    def _update_gain(self):
        """
        Calculate gain from settings. Used to convert between digital
        and physical values. Only useful if a physical dimension was
        defined.
        """
        if self.physical_dim:
            dy = self.physical_max - self.physical_min
            dx = self.digital_max - self.digital_min
            self.gain = dy / dx
        else:
            self.gain = 1

    def dig_to_phys(self, sample):
        """
        Convert a digital value to a physical value. If no physical
        dimension has been defined the digital value is returned without
        modification.

        Follows the equation of a straight line:
            y = mx + b
        """
        if self.physical_dim:
            return (self.gain * sample) + self.physical_min
        else:
            return sample

    def print(self):
        fields = list(self._fields)
        fields.extend(['sampling_freq', 'gain'])
        for field in fields:
            val = self.__getattribute__(field)
            print('{:33} {}'.format(field, val))


class EdfHeader:
    # Fields and sizes (i.e. number of bytes) as per the EDF
    # specification.
    _fields = ('version', 'subject_id', 'recording_id', 'startdate',
               'starttime', 'number_of_bytes_in_header', 'reserved',
               'number_of_data_records', 'duration_of_data_record',
               'number_of_signals')

    _sizes = (8, 80, 80, 8, 8, 8, 44, 8, 8, 4)

    __slots__ = ['version', '_subject_id', '_recording_id',
                 '_startdate', '_starttime',
                 '_number_of_bytes_in_header', 'reserved',
                 '_number_of_data_records', '_duration_of_data_record',
                 '_number_of_signals', '_signals']

    def __init__(self, subject_code='', subject_sex='', subject_dob='',
                 subject_name='', experiment_id='', investigator_id='',
                 equipment_code='', duration_of_data_record=0,
                 date_time=None, reserved='', signals=[]):
        """
        Initialises an EDF header. Default values are empty (ie.
        unknown).

        *signals* must be a list of objects of `class::Signal`.

        *reserved* must be empty is the file conforms to EDF format,
        or start 'EDF+C' or 'EDF+D' if there is an annotations signal
        (EDF+ format).

        *duration_of_data_record* can be a float, but it is recommended
        to be an integer value.
        """
        self.version = '0'  # Version is always 0.
        if date_time is None:
            date_time = dt.datetime.now()
        self.startdate = date_time
        self.starttime = date_time
        self.subject_id = EdfSubjectId(subject_code, subject_sex,
                                       subject_dob, subject_name)
        self.recording_id = EdfRecordingId(date_time, experiment_id,
                                           investigator_id,
                                           equipment_code)
        self.reserved = reserved

        # From the EDF+ specs: "The 'number of data records' can only be
        # -1 during recording. As soon as the file is closed, the
        # correct number is known and must be entered."
        self.number_of_data_records = -1

        self.duration_of_data_record = duration_of_data_record
        self.signals = signals

    def pack(self):
        """
        Returns the header as a bytes object formatted as required by
        the EDF specification.
        """
        main_hdr = ''
        for n in self._sizes:
            main_hdr += '{:<' + str(n) + '}'
        startdate = dt.datetime.strftime(self.startdate, EDF_HDR_DATE_FMT)
        starttime = '{:02}.{:02}.{:02}'.format(self.starttime.hour,
                                               self.starttime.minute,
                                               self.starttime.second)
        main_hdr = main_hdr.format(
            self.version,
            self.subject_id,
            self.recording_id,
            startdate,
            starttime,
            self.number_of_bytes_in_header,
            self.reserved,
            self.number_of_data_records,
            self.duration_of_data_record,
            self.number_of_signals)
        main_hdr = main_hdr.encode('ascii')
        assert len(main_hdr) == 256

        # The signals part of the EDF header expects each field for all
        # signals instead of all fields of one signal then all field of
        # the next signl, etc. This is annoying, because it would be
        # easy to conatenate header signals, but instead we have to
        # loop along each field.
        sig_hdr = ''
        for field in EdfSignal._fields:
            for signal in self.signals:
                if field == 'label':
                    val = signal.label
                    size = EdfSignal._sizes[EdfSignal.LABEL]
                elif field == 'transducer_type':
                    val = signal.transducer_type
                    size = EdfSignal._sizes[EdfSignal.TRANSDUCER_TYPE]
                elif field == 'physical_dim':
                    val = signal.physical_dim
                    size = EdfSignal._sizes[EdfSignal.PHYSICAL_DIM]
                elif field == 'physical_min':
                    val = signal.physical_min
                    size = EdfSignal._sizes[EdfSignal.PHYSICAL_MIN]
                elif field == 'physical_max':
                    val = signal.physical_max
                    size = EdfSignal._sizes[EdfSignal.PHYSICAL_MAX]
                elif field == 'digital_min':
                    val = signal.digital_min
                    size = EdfSignal._sizes[EdfSignal.DIGITAL_MIN]
                elif field == 'digital_max':
                    val = signal.digital_max
                    size = EdfSignal._sizes[EdfSignal.DIGITAL_MAX]
                elif field == 'prefiltering':
                    val = signal.prefiltering
                    size = EdfSignal._sizes[EdfSignal.PREFILTERING]
                elif field == 'number_of_samples_in_data_record':
                    val = signal.number_of_samples_in_data_record
                    size = EdfSignal._sizes[EdfSignal.NSAMPLES]
                elif field == 'reserved':
                    val = signal._reserved
                    size = EdfSignal._sizes[EdfSignal.RESERVED]
                fmt = '{:<' + str(size) + '}'
                val = fmt.format(val)
                sig_hdr += val
        sig_hdr = sig_hdr.encode('ascii')
        assert len(sig_hdr) == self.number_of_signals * 256

        return main_hdr + sig_hdr

    def print(self):
        """
        Display the contents of the header.
        """
        for field in self._fields:
            val = self.__getattribute__(field)
            print('{:27} {}'.format(field, val))

    @property
    def subject_id(self):
        """
        Subject (i.e. patient) identification (string). Spaces will be
        replaced by underscores.
        """
        return self._subject_id

    @subject_id.setter
    def subject_id(self, value):
        if isinstance(value, str):
            try:
                code, sex, dob, name = value.split()
                value = EdfSubjectId(code, sex, dob, name)
            except ValueError:
                raise EdfHeaderException('subject_id not understood')
        if not isinstance(value, EdfSubjectId):
            raise EdfHeaderException(
                'subject_id must be of class edfrw.EdfSubjectId')
        self._subject_id = value

    @property
    def recording_id(self):
        """
        Recording ID (string). Spaces will be replaced by underscores.
        """
        return self._recording_id

    @recording_id.setter
    def recording_id(self, value):
        if isinstance(value, str):
            try:
                (start_str, startdate, experiment_id, investigator_id,
                 equipment_code) = value.split()
                value = EdfRecordingId(startdate, experiment_id,
                                       investigator_id, equipment_code)
            except ValueError:
                raise EdfHeaderException('recording_id not understood')
        if not isinstance(value, EdfRecordingId):
            raise EdfHeaderException(
                'recording_id must be of class edfrw.EdfRecordingId')
        self._recording_id = value

    @property
    def startdate(self):
        return self._startdate

    @startdate.setter
    def startdate(self, value):
        '''
        Start date. It must be either
        (a) a string 'yyyy-mm-dd', e.g. '2016-10-25', or
        (b) a string 'd.m.y' as required by EDF, e.g. '16.10.25', or
        (c) a datetime object.
        '''
        if type(value) is str:
            try:
                value = dt.datetime.strptime(value, ISO_DATE_FMT)
            except:
                try:
                    value = dt.datetime.strptime(value, EDF_HDR_DATE_FMT)
                except ValueError as error:
                    raise EdfHeaderException(error)
        self._startdate = value.date()

    @property
    def starttime(self):
        return self._starttime

    @starttime.setter
    def starttime(self, value):
        '''
        Start time. It must be either
        (a) a string 'H.M.S' as required by EDF, e.g. '12.15.05', or
        (b) a string in standard format 'H:M:S', e.g. '12:15:05', or
        (b) a datetime object.
        '''
        if type(value) is str:
            try:
                value = dt.datetime.strptime(value, '%H:%M:%S')
            except:
                try:
                    value = dt.datetime.strptime(value, EDF_HDR_TIME_FMT)
                except ValueError as error:
                    raise EdfHeaderException(error)
        self._starttime = value.time()

    @property
    def number_of_bytes_in_header(self):
        # This value depends on the number of signals, so it should
        # be updated whenever the number of signals changes.
        return self._number_of_bytes_in_header

    @number_of_bytes_in_header.setter
    def number_of_bytes_in_header(self, value):
        self._number_of_bytes_in_header = int(value)

    @property
    def number_of_data_records(self):
        return self._number_of_data_records

    @number_of_data_records.setter
    def number_of_data_records(self, value):
        self._number_of_data_records = int(value)

    @property
    def duration_of_data_record(self):
        # This value is recommended (but not required) to be an integer
        return self._duration_of_data_record

    @duration_of_data_record.setter
    def duration_of_data_record(self, value):
        self._duration_of_data_record = float(value)

    @property
    def number_of_signals(self):
        return self._number_of_signals

    @number_of_signals.setter
    def number_of_signals(self, value):
        self._number_of_signals = int(value)

    @property
    def signals(self):
        return self._signals

    @signals.setter
    def signals(self, values):
        # Some values in the header depend on the number of signals.
        # Thus, these values must be updated whenever the signals list
        # changes.
        self.number_of_signals = len(values)
        self.number_of_bytes_in_header = (
                256 + (self.number_of_signals * 256))
        self._signals = values


if __name__ == '__main__':
    fname = '../daq/data/SC4181E0-PSG.edf'

    header = EdfHeader(subject_dob='2016-08-09')
    header.subject_id.name = 'Ramiro'

    header.signals = [EdfSignal('EEG1'), EdfSignal('EEG2')]
