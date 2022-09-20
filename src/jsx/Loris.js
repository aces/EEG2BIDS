// Create visit
useEffect(() => {
  if (!state.participantCandID || !state.session ||
    !state.siteID || !state.projectID ||
    !state.subprojectID || !state.edfData?.date) return;

  const visitDate = state.edfData['date']
      .toISOString().replace(/T.*/, '');

  socketContext.emit('create_visit', {
    candID: state.participantCandID,
    project: state.projectID,
    site: state.siteID,
    subproject: state.subprojectID,
    visit: state.session,
    date: visitDate,
  });
}, [state.participantCandID, state.session,
state.siteID, state.projectID, state.subprojectID,
state.edfData]);

// PSCID/CANDID validation
useEffect(() => {
  setState({participantID: ''});

  if (!state.participantCandID || !state.participantPSCID) {
    // TODO
    setState({participantCandID: {
      error: 'The DDCID/PSCID pair you provided' +
          ' does not match an existing candidate.',
    }});
    return;
  }

  socketContext.emit('get_participant_data', {
    candID: state.participantCandID,
  });
}, [state.participantCandID, state.participantPSCID]);


useEffect(() => {
  socketContext.on('participant_data', (data) => {
    if (data?.error) {
      // TODO: will break the value - migrate in the converter
      setState({
        participantCandID: {error: data.error},
        participantID: '',
      });
    } else if (state.participantPSCID == data.PSCID) {
      setState({
        participantID: data.PSCID,
        participantDoB: new Date(data.DoB),
        participantSex: data.Sex,
      });
    } else {
      setState({
        participantID: '',
        participantCandID: {
          error: 'The DDCID/PSCID pair you provided' +
            ' does not match an existing candidate.',
        },
      });
    }
  });
}, [state.participantPSCID]);

useEffect(() => {
  if (!socketContext?.connected) return;

  socketContext.on('new_candidate_created', (data) => {
    console.info('candidate created !!!');
    setState({
      participantID: data['PSCID'],
      participantCandID: data['CandID'],
    });
  });
}, [socketContext?.connected]);
