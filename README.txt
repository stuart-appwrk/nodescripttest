================================================================================
Extension: UL-TMP084-2021-02                                       2022-11-24
================================================================================

Issue(s): 
Overflow Inbound Orders Page. 


Affected Files:
  data/ws/usrlistoverflowinboundorders.resource
  data/ws/usrlistoverflowinboundorders.action
  data/ws/usrlistoverflowoutboundorders.resource
  data/ws/usrlistoverflowoutboundorders.action
  data/rpuxQueryColumnMappings/usrListOverflowInboundConfig.json
  data/rpuxQueryColumnMappings/usrListOverflowOutboundConfig.json
  src/cmdsrc/usrint/list_usr_overflow_inbound_orders.mcmd
  src/cmdsrc/usrint/list_usr_overflow_outbound_orders.mcmd


Removed Files:


Release Notes:
Overflow Inbound Orders and Overflow outbound Orders Page. 

FixVersion(s) :
None


As part of WMS version upgrade Overflow inbound Orders and Overflow outbound Orders page were developed.


Resolution:

Overflow inbound Orders and Overflow outbound Orders page have been developed.
 


================================================================================
               W I N D O W S   I N S T A L L A T I O N   N O T E S             
================================================================================

    1.  Start a Windows command prompt as an Administrator user

    2.  Set Visual C++ environment variables.

        You will first have to change to the Visual C++ bin directory if it 
        isn't in your search path.

        vcvars32.bat

    3.  Set JDA application environment variables.

        (2011.1 or earlier):
        cd %LESDIR%\data
          ..\..\moca\bin\servicemgr /env=<environment name> /dump
        env.bat

        (2011.2 or later):
          cd %LESDIR%\data
          ..\..\moca\bin\servicemgr -e <environment name> dump
          env.bat

        Note: If you know your env.bat file is current you can omit this step,
              if you are not sure then rebuild one.

    4.  Shutdown the MOCA server instance:  

        NON-CLUSTERED Environment

        *** IMPORTANT ***
        If you are on a production system, make sure the development system 
        whose drive has been mapped to the system being modified has also been 
        shutdown to avoid sharing violations.

        net stop moca.<environment name>

        (Or use the Windows Services snap-in to stop the MOCA service.

        CLUSTERED Environment
       
        If you are running under a Windows Server Cluster, you must use the
        Microsoft Cluster Administrator to stop the MOCA Service.

    5.  Copy the rollout distribution file into the environment's rollout 
        directory.

        cd -d %LESDIR%\rollouts
        copy <SOURCE_DIR>\EY-47_09122022_V2.zip .

    6.  Uncompress the distribution file using your preferred unzip utility  

        Make sure you extract all the files to a folder called EY-47_09122022_V2.

    7.  Install the rollout.

        perl -S rollout.pl EY-47_09122022_V2
    8.  Start up the MOCA instance:

        NON-CLUSTERED Environment
       
        net start moca.<environment name>

        (Or use the Windows Services snap-in to restart the MOCA service.

        CLUSTERED Environment

        If you are running under a Windows Server Cluster, you must use the
        Microsoft Cluster Administrator to start the MOCA Service.


================================================================================
                 U N I X   I N S T A L L A T I O N   N O T E S             
================================================================================

    1.  Login as the JDA application's administrator.

        ssh <user>@<hostname>

    2.  Shutdown the MOCA instance:

        rp stop
  
    3.  Copy the rollout distribution file into the environment's rollout 
        directory.

        cd $LESDIR/rollouts
        cp <SOURCE_DIR>/EY-47_09122022_V2.tar.gz .

    4.  Uncompress and untar the rollout archive file using tar.

        tar -xvfz EY-47_09122022_V2.tar.gz 

    5.  Install the rollout.

        perl -S rollout.pl EY-47_09122022_V2
    6.  Start up the MOCA instance:

        rp start

================================================================================
                         U N I N S T A L L   N O T E S                          
================================================================================

*** NOTES *** Attempting an uninstall of a rollout is not JDA's recommended
    defect resolution path.  If an issue is found after applying
    a rollout JDA highly recommends reporting the issue to JDA so
    that a permanent fix can be determined.

    Any attempted uninstall should be first be thoroughly tested just
    as any other change to a production system.

*** STEPS ***

    1a.  If Windows complete steps 1-6 of the install notes.
    1b.  If Unix complete steps 1-4 of the install notes.

    2.  Open the rollout control file, EY-47_09122022_V2.

    3.  If the control file line begins with the keywords of ADD, REPLACE or REMOVE
        manually restore the file(s) from the backup directory, 
        $LESDIR/temp/EY-47_09122022-<datetime_of_original_install>, back to
        their original location (if it exists; if it does not exist in the backup
        directory, remove the file from its location under $LESDIR).

    4.  If the control file line begins with the keyword REBUILD a recompile
        is needed for the C and JAVA changes.  A "make" should be completed:
            (Windows): cd %LESDIR%
                       nmake -f makefile.nt

            (Unix):    cd $LESDIR
                       make

    5.  If the control file line begins with the keyword MBUILD a mbuild is
        needed for the MOCA changes.  A "mbuild" should be completed.

    6.  If the control file line begins with any other keyword contact JDA
        for guidance.

    7a.  If Windows complete step 8 of the install notes.
    7b.  If Unix complete step 6 of the install notes.

================================================================================

BuildRollout version: DEVELOPMENT - build 2022-09-12 00:00:00
