const flagConditions = {
  FACE_present: {
    pass: 'There are face stimuli flags',
    warning: 'No face flags! There might be ' +
            'connection issue between E-prime and Netstation ' +
            'computers. Be sure to open netstation BEFORE ' +
            'E-prime, and check that the stm+ and fix+ flags ' +
            'flags are showing up in Netstation while the task ' +
            'is running.',
    flagCondition: 0,
    reason: false,
  },
  FACE_num: {
    pass: 'The number if face stimuli flags is correct.',
    warning: 'Missing Face Flag! This might mean the task ' +
            'was quit early. Please explain what happened:',
    flagCondition: 0,
    reason: true,
  },
  face_present: {
    pass: 'There are face stimuli flags',
    warning: 'No face flags! There might be ' +
            'connection issue between E-prime and Netstation ' +
            'computers. Be sure to open netstation BEFORE ' +
            'E-prime, and check that the stm+ and fix+ flags ' +
            'flags are showing up in Netstation while the task ' +
            'is running.',
    flagCondition: 0,
    reason: false,
  },
  face_num: {
    pass: 'The number if face stimuli flags is correct.',
    warning: 'Missing Face Flag! This might mean the task ' +
            'was quit early. Please explain what happened:',
    flagCondition: 0,
    reason: true,
  },
  VEP_present: {
    pass: 'There are VEP stimuli flags',
    warning: 'Noe VEP flags! There might be a connection issue ' +
            'between the Eprime and Netstation computers. Be sure to ' +
            'open netstation BEFORE Eprime and check that the ch1+ and ' +
            'ch2+ flags are showing up in Netstation while the task is ' +
            'running.',
    flagCondition: 0,
    reason: false,
  },
  VEP_num: {
    pass: 'The number of VEP flags is correct',
    warning: 'Missing VEP Flag! This might mean the task was ' +
            'quit early. Please explain what happened:',
    flagCondition: 0,
    reason: true,
  },
  MMN_present: {
    pass: 'There are MMN stimuli flags',
    warning: 'No MMN flags! There might be a connection issue between ' +
        'the Eprime and Netstation computers. Be sure to open netstation ' +
        'BEFORE Eprime, and check that the ch1+ and ch2+ flags are showing ' +
        'up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  MMN_num: {
    pass: 'The number of MMN flags is correct (equal to either exactly 1 ' +
        'or exactly 2 blocks)',
    warning: 'Missing MMN Flag! This might mean the task was quit early. ' +
        'Please explain what happened:',
    flagCondition: 0,
    reason: true,
  },
  RS_present: {
    pass: 'There is a Resting Sqtate stimuli flag',
    warning: 'No Resting State flags! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE E-prime, and check that the bas+ flags are ' +
        'showing up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  trsp_RS_present: {
    pass: 'There is at least one TRSP flag in RS task',
    warning: 'No TRSP flags in RS! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE E-prime, and check that the TRSP flags are ' +
        'showing up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  trsp_RS_num: {
    pass: 'The number of TRSP flags is correct in RS',
    warning: 'Missing TRSP Flag in RS! This might mean the task ' +
        'was quit early.',
    flagCondition: 0,
    reason: false,
  },
  bgin_RS_present: {
    pass: 'There is at least one bgin flag in RS',
    warning: 'No bgin flags in RS! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE Eprime, and check that the bgin flags are showing ' +
        'up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  bgin_RS_num: {
    pass: 'The number of bgin flags is correct in RS',
    warning: 'Missing bgin Flag in RS! This might mean the task was ' +
        'quit early.',
    flagCondition: 0,
    reason: false,
  },
  delay_RS: {
    pass: 'There is a flag delay in RS',
    warning: 'Possible flag delay in RS! Make sure Netstation is running ' +
        'before opening E-prime and check that the SESS and CELL flags ' +
        'appear in netstation right as the recording is started. If the ' +
        'problem persists, restart both computers.',
    flagCondition: 1,
    reason: false,
  },
  IBEG_RS: {
    pass: 'Impedances were opened during the task in RS.',
    warning: 'The impedances were opened during the RS. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  IEND_RS: {
    pass: 'Impedances were closed during the RS task.',
    warning: 'The impedances were closed during RS. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  SESS_RS_present: {
    pass: 'The SESS flag exists in RS',
    warning: 'Missing SESS flag in RS! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  CELL_RS_present: {
    pass: 'The CELL flag exists in RS',
    warning: 'Missing CELL flag in RS! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  RS_exists: {
    pass: 'RS task exists.',
    warning: 'RS is missing!',
    flagCondition: 0,
    reason: false,
  },
  trsp_MMN_present: {
    pass: 'There is at least one TRSP flag in MMN',
    warning: 'No TRSP flags in MMN! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE E-prime, and check that the TRSP flags are ' +
        'showing up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  trsp_MMN_num: {
    pass: 'The number of TRSP flags is correct',
    warning: 'Missing TRSP Flag in *TASK*! This might mean the task ' +
        'was quit early.',
    flagCondition: 0,
    reason: false,
  },
  bgin_MMN_present: {
    pass: 'There is at least one bgin flag in MMN',
    warning: 'No bgin flags in MMN! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE Eprime, and check that the bgin flags are showing ' +
        'up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  bgin_MMN_num: {
    pass: 'The number of bgin flags is correct in MMN',
    warning: 'Missing bgin Flag in MMN! This might mean the task ' +
        'was quit early.',
    flagCondition: 0,
    reason: false,
  },
  delay_MMN: {
    pass: 'There is a flag delay in MMN',
    warning: 'Possible flag delay in MMN! Make sure Netstation is running ' +
        'before opening E-prime and check that the SESS and CELL flags ' +
        'appear in netstation right as the recording is started. If the ' +
        'problem persists, restart both computers.',
    flagCondition: 1,
    reason: false,
  },
  IBEG_MMN: {
    pass: 'Impedances were opened during the MMN.',
    warning: 'The impedances were opened during the MMN. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  IEND_MMN: {
    pass: 'Impedances were closed during the MMN.',
    warning: 'The impedances were closed during MMN. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  SESS_MMN_present: {
    pass: 'The SESS flag exists in MMN',
    warning: 'Missing SESS flag in MMN! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  CELL_MMN_present: {
    pass: 'The CELL flag exists in MMN',
    warning: 'Missing CELL flag in MMN! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  MMN_exists: {
    pass: 'This task exists.',
    warning: 'MMN is missing!',
    flagCondition: 0,
    reason: false,
  },
  trsp_FACE_present: {
    pass: 'There is at least one TRSP flag in FACE',
    warning: 'No TRSP flags in FACE! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE E-prime, and check that the TRSP flags are ' +
        'showing up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  trsp_FACE_num: {
    pass: 'The number of TRSP flags is correct in FACE',
    warning: 'Missing TRSP Flag in FACE! This might mean the task ' +
        'was quit early.',
    flagCondition: 0,
    reason: false,
  },
  bgin_FACE_present: {
    pass: 'There is at least one bgin flag in FACE',
    warning: 'No bgin flags in FACE! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE Eprime, and check that the bgin flags are showing ' +
        'up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  bgin_FACE_num: {
    pass: 'The number of bgin flags is correct in FACE',
    warning: 'Missing bgin Flag in FACE! This might mean the task ' +
        'was quit early.',
    flagCondition: 0,
    reason: false,
  },
  delay_FACE: {
    pass: 'There is a flag delay in FACE',
    warning: 'Possible flag delay in FACE! Make sure Netstation is running ' +
        'before opening E-prime and check that the SESS and CELL flags ' +
        'appear in netstation right as the recording is started. If the ' +
        'problem persists, restart both computers.',
    flagCondition: 1,
    reason: false,
  },
  IBEG_FACE: {
    pass: 'Impedances were opened during the FACE.',
    warning: 'The impedances were opened during the FACE. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  IEND_FACE: {
    pass: 'Impedances were closed during the FACE.',
    warning: 'The impedances were closed during FACE. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  SESS_FACE_present: {
    pass: 'The SESS flag exists in FACE',
    warning: 'Missing SESS flag in FACE! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  CELL_FACE_present: {
    pass: 'The CELL flag exists in FACE',
    warning: 'Missing CELL flag in FACE! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  FACE_exists: {
    pass: 'FACE task exists.',
    warning: 'FACE is missing!',
    flagCondition: 0,
    reason: false,
  },
  trsp_VEP_present: {
    pass: 'There is at least one TRSP flag in VEP',
    warning: 'No TRSP flags in VEP! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE E-prime, and check that the TRSP flags are ' +
        'showing up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  trsp_VEP_num: {
    pass: 'The number of TRSP flags is correct in VEP',
    warning: 'Missing TRSP Flag in VEP! This might mean the task was ' +
        'quit early.',
    flagCondition: 0,
    reason: false,
  },
  bgin_VEP_present: {
    pass: 'There is at least one bgin flag in VEP',
    warning: 'No bgin flags in VEP! There might be a connection issue ' +
        'between the Eprime and Netstation computers. Be sure to open ' +
        'netstation BEFORE Eprime, and check that the bgin flags are showing ' +
        'up in Netstation while the task is running.',
    flagCondition: 0,
    reason: false,
  },
  bgin_VEP_num: {
    pass: 'The number of bgin flags is correct in VEP',
    warning: 'Missing bgin Flag in VEP! This might mean the task was ' +
        'quit early.',
    flagCondition: 0,
    reason: false,
  },
  delay_VEP: {
    pass: 'There is a flag delay in VEP',
    warning: 'Possible flag delay in VEP! Make sure Netstation is running ' +
        'before opening E-prime and check that the SESS and CELL flags ' +
        'appear in netstation right as the recording is started. If the ' +
        'problem persists, restart both computers.',
    flagCondition: 1,
    reason: false,
  },
  IBEG_VEP: {
    pass: 'Impedances were opened during the VEP.',
    warning: 'The impedances were opened during the VEP. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  IEND_VEP: {
    pass: 'Impedances were closed during the VEP.',
    warning: 'The impedances were closed during VEP. Make sure you ' +
        'close the impedance window before beginning a task.',
    flagCondition: 1,
    reason: false,
  },
  SESS_VEP_present: {
    pass: 'The SESS flag exists in VEP',
    warning: 'Missing SESS flag in VEP! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  CELL_VEP_present: {
    pass: 'The CELL flag exists in VEP',
    warning: 'Missing CELL flag in VEP! This probably isn’t an issue, ' +
        'but make sure Netstation is turned on before Eprime.',
    flagCondition: 0,
    reason: false,
  },
  VEP_exists: {
    pass: 'VEP task exists.',
    warning: 'VEP is missing!',
    flagCondition: 0,
    reason: false,
  },
  duplicate_file: {
    pass: 'There aren\'t multiple files for the same task.',
    warning: 'There are multiple files of the same task. Please explain why:',
    flagCondition: 1,
    reason: true,
  },
  high_impedance: {
    pass: 'No electrodes had high impedances.',
    warning: 'One or more electrodes had high impedances! Impedances can ' +
        'be improved by making sure all electrodes (especially ref and com) ' +
        'have good contact with the scalp, and the sponges are wet. If the ' +
        'same electrode is persistently bad, it might need to be replaced.',
    flagCondition: 1,
    reason: false,
  },
};

export default flagConditions;
