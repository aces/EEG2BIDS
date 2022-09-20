import Papa from 'papaparse';

// TODO
// process all files and automatically detect extension 
// store invalid in one array

const validateJSON = (jsons) => {
  const promisesArray = [];
  for (let i = 0; i < jsons?.length; i++) {
    const json = jsons[i];
    promisesArray.push(new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsText(json, 'UTF-8');
      fileReader.onload = (e) => {
        try {
          JSON.parse(e.target.result);
          resolve(null);
        } catch (e) {
          console.log(e);
          resolve(json.name);
        }
      };
    }));
  }
  return Promise.all(promisesArray);
};

const validateTSV = (tsvs) => {
  const promisesArray = [];
  for (let i = 0; i < tsvs?.length; i++) {
    const tsv = tsvs[i];
    promisesArray.push(new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsText(tsv, 'UTF-8');
      fileReader.onload = (e) => {
        Papa.parse(
            e.target.result,
            {
              quoteChar: '',
              complete: (results, file) => {
                console.log(results.errors);
                if (results.errors.length > 0) {
                  resolve(tsv.name);
                } else {
                  resolve(null);
                }
              },
            },
        );
      };
    }));
  }
  return Promise.all(promisesArray);
};

// Validate json metadata file
useEffect(() => {
  validateJSON(state.bidsMetadataFile)
      .then((result) => {
        setState(
            'invalidBidsMetadataFile',
            result.filter((el) => el != null),
        );
      });
}, [state.bidsMetadataFile]);

// Validate tsv event file
useEffect(() => {
  validateTSV(state.eventFiles)
      .then((result) => {
        setState({invalidEventFiles: result.filter((el) => el != null)});
      });
}, [state.eventFiles]);

// Validate json annotation file
useEffect(() => {
  validateJSON(state.annotationsJSON)
      .then((result) => {
        setState({invalidAnnotationsJSON: result.filter((el) => el != null)});
      });
}, [state.annotationsJSON]);

// Validate tsv annotation file
useEffect(() => {
  validateTSV(state.annotationsTSV)
      .then((result) => {
        setState({invalidAnnotationsTSV: result.filter((el) => el != null)});
      });
}, [state.annotationsTSV]);

// Validate metadata keys (valid keys with non-empty values)
// Valid json format
// Extract metadata values
useEffect(() => {
  if (socketContext) {
    if (state.bidsMetadataFile?.length > 0) {
      socketContext.emit('get_bids_metadata', {
        file_path: state.bidsMetadataFile[0]['path'],
        modality: state.modality,
      });
    }
  }
}, [state.bidsMetadataFile, state.modality]);

useEffect(() => {
  socketContext.on('bids_metadata', (message) => {
    if (message['error']) {
      console.error(message['error']);
    }
    setState({bidsMetadata: message});
  });
}, [socketContext]);