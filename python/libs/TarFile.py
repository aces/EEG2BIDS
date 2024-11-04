import os
from python.libs import tarfile_progress as tarfile
class TarFile:
    progress = 0
    stage = ''
    pii_progress = 0

    def calculateFileSize(self, file):
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(file):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                # skip if it is symbolic link
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)

        return total_size
            
    def packagePII(self, files, filePrefix):
        output_filename = os.path.dirname(files[0]) + os.path.sep + filePrefix + '_EEG.tar.gz'
        filesize = 0
        for file in files:
            filesize += self.calculateFileSize(file)
        with tarfile.open(output_filename, "w:gz") as tar:
            tar.setTotalSize(filesize)
            for file in files:
                tar.add(file, progress = self.update_progress)

        return output_filename

    def package(self, bids_directory):
        output_filename = bids_directory + '.tar.gz'
        with tarfile.open(output_filename, "w:gz") as tar:
            tar.add(bids_directory, arcname=os.path.basename(bids_directory), progress = self.update_progress, calculateSize=True)


    def update_progress(self, new_progress):
        if (self.stage == 'packaging PII'):
            self.pii_progress = new_progress
        else:
            self.progress = new_progress

    def set_stage(self, new_stage):
        self.stage = new_stage

