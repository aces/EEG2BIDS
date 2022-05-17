const flagConditions = {
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
        pass: 'The number if face stimuli flags is correct.'
        warning: 'Missing Face Flag! This might mean the task ' +
            'was quit early. Please explain what happened:'
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
    }
}

export default flagConditions;