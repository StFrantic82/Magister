import json,sys,numpy as np
rows=[]
for f in sys.argv[2:]: rows+=json.load(open(f))
keys=[k for k in rows[0] if k not in('y','np','win')]
X=np.array([[r[k] for k in keys] for r in rows],float)
import os
if os.environ.get('INTER'):
  ke=[k for k in keys if k not in('one','early','opp')]; E=np.array([[r[k]*r['early'] for k in ke] for r in rows],float); X=np.hstack([X,E]); keys=keys+[k+'_' for k in ke]
y=np.array([r['y'] for r in rows],float)
lam=float(sys.argv[1].split(':')[1]) if ':' in sys.argv[1] else 5.0
A=X.T@X+lam*np.eye(len(keys)); b=np.linalg.solve(A,X.T@y)
pred=X@b; print('n',len(y),'R2',1-((y-pred)**2).sum()/((y-y.mean())**2).sum(),'rmse',np.sqrt(((y-pred)**2).mean()))
SC=7.0
w={k:round(float(-v*SC),3) for k,v in zip(keys,b)}
for k in keys: print(f'{k:8s} {w[k]:8.3f}')
json.dump(w,open(sys.argv[1].split(':')[0],'w'))
