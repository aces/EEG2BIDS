
EDF specifications primer
=========================

From the `EDF's website`_:

    The European Data Format (EDF) is a simple and flexible format for
    exchange and storage of multichannel biological and physical signals.

.. _`EDF's website`: http://www.edfplus.info

EDF files consist of a header (ascii) that describes the contents of the
file and the experimental settings. The data (int16) are stored after
the header. The main aspects of the specification are described in this
section, which is useful reading for understanding the classes and
functions that make up the `edfrw library`_. For more about the European
Data Format and full specifications see
http://www.edfplus.info/specs/index.html.

.. _`edfrw library`: https://github.com/antgon/edfrw


The Header
----------

The first 256 bytes in an EDF file are the header, which contains
information about the patient, date and time of data acquisition, etc.
This is followed by another 256 bytes for each signal acquired. Signal
header(s) contain the details about the name of the signals, the
hardware used, and values to allow the transformation of raw (int16)
data values into physical values (e.g. volts). Thus, the length of the
full header (i.e. the 'header record') equals 256 + (number_of_signals *
256). The header record is ``ascii`` only, and contains the following
fields:


Header record
^^^^^^^^^^^^^

+----------------------------+------+----------+------------+
| Field                      | Size | Position | Notes      |
+============================+======+==========+============+
| version                    | 8    | 0        | [1]        |
+----------------------------+------+----------+------------+
| patient_id                 | 80   | 8        | [2]        |
+----------------------------+------+----------+------------+
| recording_id               | 80   | 88       | [3]        |
+----------------------------+------+----------+------------+
| startdate                  | 8    | 168      | dd.mm.yy   |
+----------------------------+------+----------+------------+
| starttime                  | 8    | 176      | hh.mm.ss   |
+----------------------------+------+----------+------------+
| number_of_bytes_in_header  | 8    | 184      |            |
+----------------------------+------+----------+------------+
| reserved                   | 44   | 192      | [4]        |
+----------------------------+------+----------+------------+
| number_of_data_records     | 8    | 236      | 'nr'       |
+----------------------------+------+----------+------------+
| duration_of_data_record    | 8    | 244      | in seconds |
+----------------------------+------+----------+------------+
| number_of_signals          | 4    | 252      | 'ns'       |
+----------------------------+------+----------+------------+
| (total)                    | 256  |          |            |
+----------------------------+------+----------+------------+

.. rubric:: Notes

1. 'version' is always '0'.

2. 'patient_id' must consist of 4 space-separated strings:
   Code Sex DOB Name, where

   - Code is the patient code
   - Sex is M, F, or X
   - DOB is date of birth in format dd-MMM-yyyy
   - Name is patient's name
   - (If a subfield is not known, replace with an X)

3. 'recording_id': Startdate dd-MMM-yyyy ExpID InvestigID Equipment

   - The text 'Startdate'
   - dd-MMM-yyyy, the actual start date
   - ExpID, code of the experiment/investigation
   - InvestigID, code of responsible investigator
   - Equipment, code of equipment used
   - Additional optional subfields may follow the ones above
   - Example: Startdate 02-MAR-2002 PSG-1234=2002 NN Telemetry03

4. 'reserved': empty for EDF; 'EDF+C' for continuous recording; 'EDF+D'
   if the recording is interrupted.


Signal record
^^^^^^^^^^^^^

After the main header there is information about each signal acquired.
This information forms part of the 'header record' in the specifications
but it is helpful to look at it separately:

+-------------------+------+----------+-------+
| Field             | Size | Position | Notes |
+===================+======+==========+=======+
| label             | 16   | 0        |       |
+-------------------+------+----------+-------+
| transducer        | 80   | 16       | [1]   |
+-------------------+------+----------+-------+
| physical_dim      | 8    | 96       | [2]   |
+-------------------+------+----------+-------+
| physical_min      | 8    | 104      |       |
+-------------------+------+----------+-------+
| physical_max      | 8    | 112      |       |
+-------------------+------+----------+-------+
| digital_min       | 8    | 120      | [3]   |
+-------------------+------+----------+-------+
| digital_max       | 8    | 128      | [3]   |
+-------------------+------+----------+-------+
| prefiltering      | 80   | 136      | [4]   |
+-------------------+------+----------+-------+
| number_of_samples | 8    | 216      |       |
+-------------------+------+----------+-------+
| reserved          | 32   | 224      |       |
+-------------------+------+----------+-------+
| (total)           | 256  |          |       |
+-------------------+------+----------+-------+

.. rubric:: Notes

1. 'transducer' type, e.g. 'thermistor'.

2. 'physical_dim' (physical dimension, e.g. 'uV') must start with a
   prefix (in this example u) followed by the basic dimension (in this
   example V). For full details see
   http://www.edfplus.info/specs/edftexts.html.

3. The digital range must be somewhere between -32768 and 32767 (because
   data samples are 16-bit signed integers).

4. 'prefiltering': e.g. for high-pass, low-pass and notch filters:
   'HP:0.1 Hz LP:75 Hz N:50 Hz'.

Thus, after the main header there are 256 bytes for each signal
acquired. It is worth noting that each field in the signal record holds
the values for all signals (rather than the header storing one full
signal record, then a second full signal record, etc). That is, if e.g.
two signals are acquired, then there will be two consecutive 'label'
fields (16 + 16 bytes), then two consecutive 'transducer' fields (80 +
80 bytes), then two 'physical_dim' fields (8 + 8 bytes), etc.


Data record
-----------

Data records follow after the header record. Here, data samples (of type
int16) are stored in blocks ('data record'). Each block contains the
samples acquired during a period of time specified in the header as
'duration_of_data_record', and the total number of blocks in the file
are 'number_of_data_records'. Note that EDF allows the acquisition of
signals at different sampling rates; the number of samples per signal in
each data block is in the signal header
('number_of_samples_in_data_record').

For example, two signals signal_A and signal_B are acquired at 100 Hz
and 5 Hz respectively. The data are saved every 20 seconds
(duration_of_data_record = 20). Thus, one block of data (a data record)
will consist of 2000 samples (number_of_samples_in_data_record = 100 Hz
times 20 seconds = 2000) from signal_A followed by 100 samples
(number_of_samples_in_data_record = 5 Hz times 20 seconds = 100) from
signal_B. If the header indicates that there are 70 such blocks
(number_of_data_records = 70), then the total duration of the recording
would be 70 x 20 = 1400 seconds (number_of_data_records times
duration_of_data_record).


Converting digital samples to physical dimensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Data samples are stored as 16-bit (2-byte signed, little endian, two's
complement) integers. An easy way to convert those values to their
physical equivalent is by using the line equation with the information
stored in the `Signal record`_.

The slope *m* (or gain) of a straight line is the ratio of change in *y*
by change in *x*::

    m = (y1 - y0) / (x1 - x0)

and if the slope *m* and the intercept *b* are known, then the line can
be described by::

    y = m * x + b

It can be seen that the raw int16 data values stored in an EDF file
correspond to *x* in that equation, that the physical values that we are
looking for are *y*, and that these two are related by the parameters
set in the `Signal record`_.

The slope can be calculated as::

    m = (y1 - y0) / (x1 - x0)
    m = (physical_max - physical_min) / (digital_max - digital_min)

and the offset (or intercept) *b* will be the physical_min value. From
these the physical values can be obtained using  the line equation::

    b = offset = physical_min
    y = m * x + b
    physical_value = (m * digital_value) + b

Example 1.
    An EDF file contains data obtained after measuring voltage with the
    adc from the mbed LPC1768. The native EDF data are stored as 2-byte
    integer digital samples. The mbed has an 12-bit adc, so its digital
    range is from 0 to 4095, and the reference voltage in the mbed is
    3.3 V, so the physical range that the adc can measure is 0 V to 3.3
    V. Thus, the header record in such EDF file would be::

        physical_dim = 'V'
        physical_min = 0
        physical_max = 3.3
        digital_min = 0
        digital_max = 4095

    These parameters are used to calculate the gain *m* (slope)::

        m = (y1 - y0) / (x1 - x0)
        m = (physical_max - physical_min) / (digital_max - digital_min)
        m = (3.3 - 0) / (4095 - 0)
        m = 0.0008

    and with that the physical values (voltage)::

        physical_value = (m * digital_value) + physical_min
        physical_value = (0.0008 * digital_value) + 0

    A digital value of 2048 will represent (0.0008 * 2048) + 0 = 1.65
    volts, as expected.

Example 2.
    EEG data are acquired using a commercial system. The manufacturer
    explains in the documentation that the analog outputs from their
    hardware are signals that range between 0 and 5 volts, and are
    centred at 2.048 V, so::

        physical_dim = 'V'
        physical_min = 0 - 2.048 = -2.048
        physical_max = 5 - 2.048 = 2.952

    If these signals were acquired with a 14-bit ADC, then::

        digital_min = 0
        digital_max = 2**14 - 1 = 16383

    and thus::

        m = (physical_max - physical_min) / (digital_max - digital_min)
        m = (2.952 + 2.048) / (16383 - 0)
        m = 5 / 16383 = 0.00031
        b = offset = physical_min = -2.048
        y = m * x + b
        physical_value = (0.00031 * digital_value) - 2.048
